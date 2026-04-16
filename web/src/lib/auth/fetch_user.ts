import { cookies, headers } from 'next/headers'

import { fetchJson } from '@/lib/fetch/http'
import { API_GATEWAY_URL } from '@/lib/types/url'
import { User } from '@/lib/types/types'

export const getAccessToken = async () => {
  const cookieStore = await cookies()
  return cookieStore.get('access_token')?.value as string
}

export const getRefreshToken = async () => {
  const cookieStore = await cookies()
  return cookieStore.get('refresh_token')?.value as string
}

export async function fetchUser(): Promise<User> {
  const headersList = await headers()
  const username = headersList.get('x-user-username')
  const email = headersList.get('x-user-email')
  const asal_sekolah = headersList.get('x-user-asal_sekolah')
  const user_id = headersList.get('x-user-id')

  if (username && email && asal_sekolah && user_id) {
    return { username, email, asal_sekolah, user_id }
  }

  try {
    const accessToken = await getAccessToken()
    const refreshToken = await getRefreshToken()

    if (!accessToken && !refreshToken) {
      return null
    }

    const userData = await fetchUserClient(accessToken, refreshToken)
    if (userData) {
      return {
        username: userData.username,
        email: userData.email,
        asal_sekolah: userData.asal_sekolah,
        user_id: userData.user_id,
      }
    }
  } catch (error) {
    console.error('Error fetching user data:', error)
  }

  return null
}

export const fetchUserClient = async (
  accessToken?: string,
  refreshToken?: string
) => {
  try {
    return await fetchJson<{
      username: string
      email: string
      asal_sekolah: string
      user_id: string | number
    }>(`${API_GATEWAY_URL}/api/me`, {
      method: 'GET',
      accessToken,
      refreshToken,
    })
  } catch {
    return null
  }
}
