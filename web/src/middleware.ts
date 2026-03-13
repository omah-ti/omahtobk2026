/* eslint-disable @typescript-eslint/no-explicit-any */

// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function setHeaders(headers: Headers, userData: any) {
  headers.set('x-user-id', String(userData.user_id))
  headers.set('x-user-asal_sekolah', userData.asal_sekolah)
  headers.set('x-user-username', userData.username)
  headers.set('x-user-email', userData.email)
}

function forwardSetCookies(response: NextResponse, upstreamResponse: Response) {
  const headers = upstreamResponse.headers as Headers & {
    getSetCookie?: () => string[]
  }
  const setCookies = headers.getSetCookie?.()

  if (setCookies && setCookies.length > 0) {
    for (const cookie of setCookies) {
      response.headers.append('set-cookie', cookie)
    }
    return
  }

  const combinedSetCookie = upstreamResponse.headers.get('set-cookie')
  if (combinedSetCookie) {
    response.headers.set('set-cookie', combinedSetCookie)
  }
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

function nextWithUser(request: NextRequest, userData: any, refreshResponse?: Response) {
  const requestHeaders = new Headers(request.headers)
  setHeaders(requestHeaders, userData)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  if (refreshResponse) {
    forwardSetCookies(response, refreshResponse)
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
    return NextResponse.next()
  }

  if (accessToken) {
    try {
      const res = await validateSession(`access_token=${accessToken}`)
      if (res.ok) {
        const userData = await res.json()
        return nextWithUser(request, userData)
      }
    } catch (error) {
      console.error('Access token validation error:', error)
    }
  }

  if (refreshToken) {
    try {
      const res = await refreshSession(`refresh_token=${refreshToken}`)
      if (res.ok) {
        const userData = await res.json()
        return nextWithUser(request, userData, res)
      }
    } catch (error) {
      console.error('Refresh token error:', error)
    }
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
