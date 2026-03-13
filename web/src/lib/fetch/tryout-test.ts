import {
  SOAL_URL,
  TRYOUT_URL,
  PUBLIC_TRYOUT_URL,
  PUBLIC_SOAL_URL,
} from '@/lib/types/url'
import { Jawaban } from '@/lib/types/types'

const cookieHeaders = (accessToken?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (accessToken) {
    headers.Cookie = `access_token=${accessToken}`
  }

  return headers
}

export const getTryoutUrl = (isPublic?: boolean) => {
  return isPublic ? PUBLIC_TRYOUT_URL : TRYOUT_URL
}

export const getSoalUrl = (isPublic?: boolean) => {
  return isPublic ? PUBLIC_SOAL_URL : SOAL_URL
}

export const getCurrentTryout = async (
  accessToken?: string,
  isPublic?: boolean
) => {
  try {
    const tryoutUrl = getTryoutUrl(isPublic)
    const res = await fetch(`${tryoutUrl}/sync/current`, {
      method: 'GET',
      credentials: 'include',
      headers: cookieHeaders(accessToken),
    })
    if (!res.ok) {
      return null
    }

    return res.json()
  } catch (error) {
    console.error('Error fetching current tryout:', error)
    return null
  }
}

export const getSoal = async (
  subtest: string,
  accessToken?: string,
  isPublic?: boolean
) => {
  try {
    const soalUrl = getSoalUrl(isPublic)
    const res = await fetch(`${soalUrl}/paket1?subtest=${subtest}`, {
      method: 'GET',
      headers: cookieHeaders(accessToken),
      credentials: 'include',
      cache: 'force-cache',
    })
    if (!res.ok) {
      throw new Error('Failed to fetch soal')
    }

    return res.json()
  } catch (error) {
    console.error('Error fetching soal:', error)
    throw new Error('Failed to fetch soal: ' + (error instanceof Error ? error.message : 'Unknown error'))
  }
}

export const syncTryout = async (
  jawaban: Jawaban[],
  accessToken?: string,
  isPublic?: boolean
) => {
  try {
    const tryoutUrl = getTryoutUrl(isPublic)
    const payload = {
      answers: jawaban,
    }
    const res = await fetch(`${tryoutUrl}/sync`, {
      method: 'POST',
      headers: cookieHeaders(accessToken),
      credentials: 'include',
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      throw Error(
        'Anda tidak mengumpulkan jawaban tepat waktu, silahkan mulai ulang Tryout.'
      )
    }

    return res.json()
  } catch (error) {
    console.error('Error syncing tryout:', error)
    throw error
  }
}

export const progressTryout = async (
  jawaban: Jawaban[],
  accessToken?: string,
  isPublic?: boolean
) => {
  try {
    const tryoutUrl = getTryoutUrl(isPublic)
    const payload = {
      answers: jawaban,
    }
    const res = await fetch(`${tryoutUrl}/sync/progress`, {
      method: 'POST',
      headers: cookieHeaders(accessToken),
      credentials: 'include',
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      throw new Error(
        'Gagal memprogres Tryout, waktu pengumpulan sudah habis.'
      )
    }

    return res.json()
  } catch (error) {
    console.error('Error progressing tryout:', error)
    throw new Error('Gagal memprogres Tryout: ' + (error instanceof Error ? error.message : 'Unknown error'))
  }
}

export const startTryout = async (accessToken?: string, isPublic?: boolean) => {
  try {
    const tryoutUrl = getTryoutUrl(isPublic)

    const res = await fetch(`${tryoutUrl}/start-attempt/paket1`, {
      method: 'POST',
      headers: cookieHeaders(accessToken),
      credentials: 'include',
    })

    if (!res.ok) {
      throw new Error('Failed to start tryout')
    }

    return res.json()
  } catch (error) {
    console.error('Error starting tryout:', error)
    throw new Error('Failed to start tryout: ' + (error instanceof Error ? error.message : 'Unknown error'))
  }
}
