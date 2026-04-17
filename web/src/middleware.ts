/* eslint-disable @typescript-eslint/no-explicit-any */

// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { singleFlightByKey } from '@/lib/auth/single-flight'

const ACCESS_TOKEN_HEADER = 'x-auth-access-token'

function setHeaders(headers: Headers, userData: any, accessToken?: string) {
  headers.set('x-user-id', String(userData.user_id))
  headers.set('x-user-asal_sekolah', userData.asal_sekolah)
  headers.set('x-user-username', userData.username)
  headers.set('x-user-email', userData.email)

  if (accessToken) {
    headers.set(ACCESS_TOKEN_HEADER, accessToken)
  }
}

function getSetCookieHeaders(upstreamResponse: Response): string[] {
  const headers = upstreamResponse.headers as Headers & {
    getSetCookie?: () => string[]
  }
  const setCookies = headers.getSetCookie?.()

  if (setCookies && setCookies.length > 0) {
    return setCookies
  }

  const combinedSetCookie = upstreamResponse.headers.get('set-cookie')
  if (!combinedSetCookie) {
    return []
  }

  return [combinedSetCookie]
}

function extractCookieValueFromSetCookies(
  setCookies: string[],
  cookieName: string
): string | undefined {
  const cookiePattern = new RegExp(`${cookieName}=([^;]+)`)

  for (const setCookie of setCookies) {
    const match = setCookie.match(cookiePattern)
    if (match?.[1]) {
      return match[1]
    }
  }

  return undefined
}

async function validateSession(cookieHeader: string) {
  return fetch(`${process.env.API_GATEWAY_URL}/api/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
    cache: 'no-store',
  })
}

async function refreshSession(cookieHeader: string) {
  return fetch(`${process.env.API_GATEWAY_URL}/api/auth/refresh`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
    cache: 'no-store',
  })
}

async function resolveSession(
  accessToken?: string,
  refreshToken?: string
): Promise<
  | {
      userData: any
      resolvedAccessToken?: string
      setCookies?: string[]
    }
  | undefined
> {
  if (accessToken) {
    try {
      const validated = await validateSession(`access_token=${accessToken}`)
      if (validated.ok) {
        return {
          userData: await validated.json(),
          resolvedAccessToken: accessToken,
        }
      }
    } catch (error) {
      console.error('Access token validation error:', error)
    }
  }

  if (refreshToken) {
    try {
      const refreshedSession = await singleFlightByKey(
        `refresh:${refreshToken}`,
        async () => {
          const refreshed = await refreshSession(`refresh_token=${refreshToken}`)
          if (!refreshed.ok) {
            return undefined
          }

          const setCookies = getSetCookieHeaders(refreshed)
          const refreshedAccessToken = extractCookieValueFromSetCookies(
            setCookies,
            'access_token'
          )

          return {
            userData: await refreshed.json(),
            resolvedAccessToken: refreshedAccessToken,
            setCookies,
          }
        }
      )

      if (refreshedSession) {
        return refreshedSession
      }
    } catch (error) {
      console.error('Refresh token error:', error)
    }
  }

  return undefined
}

function nextWithUser(
  request: NextRequest,
  userData: any,
  resolvedAccessToken?: string,
  setCookies?: string[]
) {
  const requestHeaders = new Headers(request.headers)
  setHeaders(requestHeaders, userData, resolvedAccessToken)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  if (setCookies && setCookies.length > 0) {
    for (const cookie of setCookies) {
      response.headers.append('set-cookie', cookie)
    }
  }

  return response
}

export async function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('access_token')?.value
  const refreshToken = request.cookies.get('refresh_token')?.value

  // // Define public paths that don't require authentication
  const publicPaths = ['/', '/login', '/register', '/forgot-password']

  // Add paths under tryout/* (but not /tryout exactly)
  const currentPath = request.nextUrl.pathname

  // Special case: tryout/pembahasan requires authentication, other tryout/ paths are public
  const isTryoutPembahasan = currentPath.startsWith('/tryout/pembahasan')
  const isTryoutSubpath =
    currentPath.startsWith('/tryout/') &&
    currentPath !== '/tryout/' &&
    !isTryoutPembahasan

  // Check if current path is public
  const isPublicPath =
    publicPaths.some(
      (path) =>
        currentPath === path || (path !== '/' && currentPath.startsWith(path))
    ) || isTryoutSubpath

  // Public routes should not trigger upstream auth checks.
  if (isPublicPath) {
    const publicSession = await resolveSession(accessToken, refreshToken)
    if (publicSession) {
      return nextWithUser(
        request,
        publicSession.userData,
        publicSession.resolvedAccessToken,
        publicSession.setCookies
      )
    }

    return NextResponse.next()
  }

  const protectedSession = await resolveSession(accessToken, refreshToken)
  if (protectedSession) {
    return nextWithUser(
      request,
      protectedSession.userData,
      protectedSession.resolvedAccessToken,
      protectedSession.setCookies
    )
  }

  // Otherwise, redirect to login
  return NextResponse.redirect(new URL('/login', request.url))
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    // Apply to all routes except public assets, api routes, and specific public pages
    '/((?!_next/static|_next/image|.*\\.png$|.*\\.jpg$|.*\\.webp$|favicon.ico|api/refresh-token|api/public).*)',
  ],
}
