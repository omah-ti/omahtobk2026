import { TRYOUT_URL } from '@/lib/types/url'
import {
  LeaderboardResponse,
  ProgressOverviewResponse,
  SubtestsProgressResponse,
  SubtestsScoreResponse,
} from '@/lib/types/types'
import { fetchJson } from '@/lib/fetch/http'

export const getSubtestsScore = async (
  accessToken?: string,
  refreshToken?: string
): Promise<SubtestsScoreResponse> => {
  try {
    return await fetchJson<SubtestsScoreResponse>(`${TRYOUT_URL}/subtests-score`, {
      method: 'GET',
      accessToken,
      refreshToken,
      cache: 'no-store',
    })
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
    return await fetchJson<LeaderboardResponse>(`${TRYOUT_URL}/leaderboard`, {
      method: 'GET',
      accessToken,
      refreshToken,
      cache: 'no-store',
    })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return null
  }
}

export const getSubtestsProgress = async (
  accessToken?: string,
  refreshToken?: string
): Promise<SubtestsProgressResponse> => {
  try {
    return await fetchJson<SubtestsProgressResponse>(
      `${TRYOUT_URL}/subtests-progress`,
      {
        method: 'GET',
        accessToken,
        refreshToken,
        cache: 'no-store',
      }
    )
  } catch (error) {
    console.error('Error fetching subtests progress:', error)
    return null
  }
}

export const getProgressOverview = async (
  accessToken?: string,
  refreshToken?: string
): Promise<ProgressOverviewResponse> => {
  try {
    return await fetchJson<ProgressOverviewResponse>(
      `${TRYOUT_URL}/progress-overview`,
      {
        method: 'GET',
        accessToken,
        refreshToken,
        cache: 'no-store',
      }
    )
  } catch (error) {
    console.error('Error fetching progress overview:', error)
    return null
  }
}

export const getOngoingAttempt = async (
  accessToken?: string,
  refreshToken?: string
) => {
  try {
    const response = await fetchJson<{ data?: unknown }>(
      `${TRYOUT_URL}/ongoing-attempts`,
      {
        method: 'GET',
        accessToken,
        refreshToken,
      }
    )

    return response?.data != null
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
    const response = await fetchJson<{ data?: unknown }>(
      `${TRYOUT_URL}/finished-attempt`,
      {
        method: 'GET',
        accessToken,
        refreshToken,
      }
    )

    return response?.data != null
  } catch (error) {
    console.error('Error fetching finished attempt:', error)
    return false
  }
}

export const getPembahasanPaket1 = async (
  accessToken?: string,
  refreshToken?: string
): Promise<any> => {
  try {
    return await fetchJson<any>(`${TRYOUT_URL}/pembahasan?paket=paket1`, {
      method: 'GET',
      accessToken,
      refreshToken,
      cache: 'force-cache',
    })
  } catch (error) {
    console.error('Error fetching pembahasan paket1:', error)
    return null
  }
}
