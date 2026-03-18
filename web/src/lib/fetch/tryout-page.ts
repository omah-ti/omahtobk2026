import { TRYOUT_URL } from '@/lib/types/url'
import { SubtestsScoreResponse, LeaderboardResponse } from '@/lib/types/types'

const cookieHeaders = (accessToken?: string, refreshToken?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const cookieParts: string[] = []
  if (accessToken) cookieParts.push(`access_token=${accessToken}`)
  if (refreshToken) cookieParts.push(`refresh_token=${refreshToken}`)
  if (cookieParts.length > 0) {
    headers.Cookie = cookieParts.join('; ')
  }

  return headers
}

export const getSubtestsScore = async (
  accessToken?: string,
  refreshToken?: string
): Promise<SubtestsScoreResponse> => {
  try {
    const res = await fetch(`${TRYOUT_URL}/subtests-score`, {
      method: 'GET',
      headers: cookieHeaders(accessToken, refreshToken),
      credentials: 'include',
      cache: 'no-store',
    })
    if (res.ok) {
      const responseJSON = await res.json()
      return responseJSON
    }
    return null
  } catch (error) {
    console.error('Error fetching subtests score:', error)
    return null
  }
}

export const getLeaderboard = async (
  accessToken?: string,
  refreshToken?: string
): Promise<LeaderboardResponse> => {
  try {
    const res = await fetch(`${TRYOUT_URL}/leaderboard`, {
      method: 'GET',
      headers: cookieHeaders(accessToken, refreshToken),
      credentials: 'include',
//      next: { revalidate: 3600 },
      cache: 'no-store',
    })
    if (res.ok) {
      const responseJSON = await res.json()
      return responseJSON
    }
    return null
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return null
  }
}

export const getOngoingAttempt = async (
  accessToken?: string,
  refreshToken?: string
) => {
  try {
    const res = await fetch(`${TRYOUT_URL}/ongoing-attempts`, {
      method: 'GET',
      headers: cookieHeaders(accessToken, refreshToken),
      credentials: 'include',
    })
    if (res.ok) {
      const responseJSON = await res.json()
      const { data } = responseJSON
      if (data != null) {
        return true
      }
    }
    return false
  } catch (error) {
    console.error('Error fetching ongoing attempt:', error)
    return false
  }
}

export const getFinishedAttempt = async (
  accessToken?: string,
  refreshToken?: string
) => {
  try {
    const res = await fetch(`${TRYOUT_URL}/finished-attempt`, {
      method: 'GET',
      headers: cookieHeaders(accessToken, refreshToken),
      credentials: 'include',
    })
    if (res.ok) {
      const responseJSON = await res.json()
      const { data } = responseJSON
      if (data != null) {
        return true
      }
      return false
    }
    return false
  } catch (error) {
    console.error('Error fetching finished attempt:', error)
    return false
  }
}

export const getPembahasanPaket1 = async (
  accessToken?: string,
  refreshToken?: string
) => {
  try {
    const res = await fetch(`${TRYOUT_URL}/pembahasan?paket=paket1`, {
      method: 'GET',
      headers: cookieHeaders(accessToken, refreshToken),
      credentials: 'include',
      cache: 'force-cache'
    })
    if (res.ok) {
      const responseJSON = await res.json()
      return responseJSON
    }
    return null
  } catch (error) {
    console.error('Error fetching pembahasan paket1:', error)
    return null
  }
}
