import { TRYOUT_URL } from '@/lib/types/url'
import { SubtestsScoreResponse, LeaderboardResponse } from '@/lib/types/types'

export const getSubtestsScore = async (
  accessToken: string
): Promise<SubtestsScoreResponse> => {
  try {
    const res = await fetch(`${TRYOUT_URL}/subtests-score`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${accessToken}`,
      },
      credentials: 'include',
      next: { revalidate: 3600 },
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
  accessToken: string
): Promise<LeaderboardResponse> => {
  try {
    const res = await fetch(`${TRYOUT_URL}/leaderboard`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${accessToken}`,
      },
      credentials: 'include',
      next: { revalidate: 3600 },
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

export const getOngoingAttempt = async (accessToken: string) => {
  try {
    const res = await fetch(`${TRYOUT_URL}/ongoing-attempts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${accessToken}`,
      },
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

export const getFinishedAttempt = async (accessToken: string) => {
  try {
    const res = await fetch(`${TRYOUT_URL}/finished-attempt`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${accessToken}`,
      },
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

export const getPembahasanPaket1 = async (accessToken: string) => {
  try {
    const res = await fetch(`${TRYOUT_URL}/pembahasan?paket=paket1`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${accessToken}`,
      },
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
