import {
  SOAL_URL,
  TRYOUT_URL,
  PUBLIC_TRYOUT_URL,
  PUBLIC_SOAL_URL,
} from '@/lib/types/url'
import { Jawaban } from '@/lib/types/types'

const cookieHeaders = (accessToken?: string, refreshToken?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const cookieParts: string[] = []
  if (accessToken) {
    cookieParts.push(`access_token=${accessToken}`)
  }
  if (refreshToken) {
    cookieParts.push(`refresh_token=${refreshToken}`)
  }

  if (cookieParts.length > 0) {
    headers.Cookie = cookieParts.join('; ')
  }

  return headers
}

const mapTryoutSyncError = async (
  res: Response,
  fallbackMessage: string
): Promise<Error> => {
  let backendMessage = ''
  try {
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await res.json()
      backendMessage = body?.message || body?.error || ''
    } else {
      backendMessage = await res.text()
    }
  } catch {
    backendMessage = ''
  }

  switch (res.status) {
    case 401:
      return new Error('Sesi login kamu habis. Silahkan login ulang.')
    case 404:
      return new Error(
        'Tidak ada tryout yang sedang berjalan. Silahkan mulai tryout lagi.'
      )
    case 410:
      return new Error(
        'Waktu subtest sudah habis. Silahkan mulai ulang dari dashboard tryout.'
      )
    case 409:
      return new Error(
        backendMessage ||
          'Status tryout sudah berubah. Kembali ke dashboard untuk melanjutkan.'
      )
    case 400:
      return new Error(backendMessage || 'Data jawaban tidak valid.')
    default:
      return new Error(backendMessage || fallbackMessage)
  }
}

const mapSoalFetchError = async (
  res: Response,
  fallbackMessage: string
): Promise<Error> => {
  let backendMessage = ''
  try {
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await res.json()
      backendMessage = body?.message || body?.error || ''
    } else {
      backendMessage = await res.text()
    }
  } catch {
    backendMessage = ''
  }

  switch (res.status) {
    case 401:
      return new Error('Sesi login kamu habis. Silahkan login ulang.')
    case 404:
      return new Error(
        backendMessage || 'Soal untuk subtest ini tidak ditemukan.'
      )
    case 500:
      return new Error(
        backendMessage || 'Server soal sedang bermasalah. Silahkan coba lagi.'
      )
    case 502:
    case 503:
    case 504:
      return new Error(
        backendMessage || 'Layanan soal sedang tidak tersedia. Silahkan coba lagi.'
      )
    default:
      return new Error(backendMessage || fallbackMessage)
  }
}

export const getTryoutUrl = (isPublic?: boolean) => {
  return isPublic ? PUBLIC_TRYOUT_URL : TRYOUT_URL
}

export const getSoalUrl = (isPublic?: boolean) => {
  return isPublic ? PUBLIC_SOAL_URL : SOAL_URL
}

export const getCurrentTryout = async (
  accessToken?: string,
  isPublic?: boolean,
  refreshToken?: string
) => {
  try {
    const tryoutUrl = getTryoutUrl(isPublic)
    const res = await fetch(`${tryoutUrl}/sync/current`, {
      method: 'GET',
      credentials: 'include',
      headers: cookieHeaders(accessToken, refreshToken),
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
  isPublic?: boolean,
  refreshToken?: string
) => {
  const soalUrl = getSoalUrl(isPublic)
  try {
    const res = await fetch(`${soalUrl}/paket1?subtest=${subtest}`, {
      method: 'GET',
      headers: cookieHeaders(accessToken, refreshToken),
      credentials: 'include',
      cache: 'force-cache',
    })
    if (!res.ok) {
      throw await mapSoalFetchError(
        res,
        'Gagal memuat soal. Silahkan coba lagi.'
      )
    }

    return res.json()
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error fetching soal:', {
        subtest,
        soalUrl,
        message: error.message,
      })
      throw error
    }

    console.error('Error fetching soal:', {
      subtest,
      soalUrl,
      message: 'Unknown error',
    })
    throw new Error('Gagal memuat soal. Silahkan coba lagi.')
  }
}

export const syncTryout = async (
  jawaban: Jawaban[],
  accessToken?: string,
  isPublic?: boolean,
  refreshToken?: string
) => {
  try {
    const tryoutUrl = getTryoutUrl(isPublic)
    const payload = {
      answers: jawaban,
    }
    const res = await fetch(`${tryoutUrl}/sync`, {
      method: 'POST',
      headers: cookieHeaders(accessToken, refreshToken),
      credentials: 'include',
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      throw await mapTryoutSyncError(
        res,
        'Gagal menyinkronkan jawaban tryout. Silahkan coba lagi.'
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
  isPublic?: boolean,
  refreshToken?: string
) => {
  try {
    const tryoutUrl = getTryoutUrl(isPublic)
    const payload = {
      answers: jawaban,
    }
    const res = await fetch(`${tryoutUrl}/sync/progress`, {
      method: 'POST',
      headers: cookieHeaders(accessToken, refreshToken),
      credentials: 'include',
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      throw await mapTryoutSyncError(
        res,
        'Gagal memprogres tryout. Silahkan coba lagi.'
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
