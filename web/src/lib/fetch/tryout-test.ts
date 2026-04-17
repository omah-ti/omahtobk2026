import {
  PUBLIC_SOAL_URL,
  PUBLIC_TRYOUT_URL,
  SOAL_URL,
  TRYOUT_URL,
} from '@/lib/types/url'
import { Jawaban } from '@/lib/types/types'
import { ApiFetchError, fetchJson } from '@/lib/fetch/http'

type SubtestSyncPayload = {
  answers: Jawaban[]
}

type SubtestSyncResponse = {
  message: string
  data: {
    subtest: string
    answers: Array<{
      kode_soal: string
      jawaban: string
    }>
    time_limit: string
  }
}

export const getTryoutUrl = (isPublic?: boolean) => {
  return isPublic ? PUBLIC_TRYOUT_URL : TRYOUT_URL
}

export const getSoalUrl = (isPublic?: boolean) => {
  return isPublic ? PUBLIC_SOAL_URL : SOAL_URL
}

const mapTryoutSyncError = (
  error: unknown,
  fallbackMessage: string
): Error => {
  if (!(error instanceof ApiFetchError)) {
    if (error instanceof Error) {
      return error
    }
    return new Error(fallbackMessage)
  }

  const backendMessage = error.message || ''

  switch (error.status) {
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

const mapSoalFetchError = (error: unknown, fallbackMessage: string): Error => {
  if (!(error instanceof ApiFetchError)) {
    if (error instanceof Error) {
      return error
    }
    return new Error(fallbackMessage)
  }

  const backendMessage = error.message || ''

  switch (error.status) {
    case 401:
      return new Error('Sesi login kamu habis. Silahkan login ulang.')
    case 404:
      return new Error(backendMessage || 'Soal untuk subtest ini tidak ditemukan.')
    case 500:
      return new Error(
        backendMessage || 'Server soal sedang bermasalah. Silahkan coba lagi.'
      )
    case 502:
    case 503:
    case 504:
      return new Error(
        backendMessage ||
          'Layanan soal sedang tidak tersedia. Silahkan coba lagi.'
      )
    default:
      return new Error(backendMessage || fallbackMessage)
  }
}

export const getCurrentTryout = async (
  accessToken?: string,
  isPublic?: boolean,
  refreshToken?: string
): Promise<any | null> => {
  try {
    const tryoutUrl = getTryoutUrl(isPublic)
    return await fetchJson<any>(`${tryoutUrl}/current`, {
      method: 'GET',
      accessToken,
      refreshToken,
    })
  } catch (error) {
    console.error('Error fetching current tryout:', error)
    return null
  }
}

export const startSubtest = async (
  subtest: string,
  accessToken?: string,
  isPublic?: boolean,
  refreshToken?: string
): Promise<SubtestSyncResponse> => {
  const tryoutUrl = getTryoutUrl(isPublic)

  try {
    return await fetchJson<SubtestSyncResponse>(`${tryoutUrl}/${subtest}/start`, {
      method: 'POST',
      accessToken,
      refreshToken,
    })
  } catch (error) {
    const mappedError = mapTryoutSyncError(
      error,
      'Gagal memulai subtest. Silahkan coba lagi.'
    )

    console.error('Error starting subtest:', {
      subtest,
      message: mappedError.message,
    })

    throw mappedError
  }
}

export const saveSubtestAnswers = async (
  subtest: string,
  payload: SubtestSyncPayload,
  accessToken?: string,
  isPublic?: boolean,
  refreshToken?: string
): Promise<SubtestSyncResponse> => {
  const tryoutUrl = getTryoutUrl(isPublic)

  try {
    return await fetchJson<SubtestSyncResponse>(`${tryoutUrl}/${subtest}/answers`, {
      method: 'PUT',
      accessToken,
      refreshToken,
      body: payload,
    })
  } catch (error) {
    const mappedError = mapTryoutSyncError(
      error,
      'Gagal menyimpan jawaban subtest. Silahkan coba lagi.'
    )

    console.error('Error saving subtest answers:', {
      subtest,
      message: mappedError.message,
    })

    throw mappedError
  }
}

export const submitSubtest = async (
  subtest: string,
  payload: SubtestSyncPayload,
  accessToken?: string,
  isPublic?: boolean,
  refreshToken?: string
): Promise<any> => {
  const tryoutUrl = getTryoutUrl(isPublic)

  try {
    return await fetchJson<any>(`${tryoutUrl}/${subtest}/submit`, {
      method: 'POST',
      accessToken,
      refreshToken,
      body: payload,
    })
  } catch (error) {
    const mappedError = mapTryoutSyncError(
      error,
      'Gagal submit subtest. Silahkan coba lagi.'
    )

    console.error('Error submitting subtest:', {
      subtest,
      message: mappedError.message,
    })

    throw mappedError
  }
}

export const getSoal = async (
  subtest: string,
  accessToken?: string,
  isPublic?: boolean,
  refreshToken?: string
): Promise<any> => {
  const soalUrl = getSoalUrl(isPublic)

  try {
    return await fetchJson<any>(`${soalUrl}/paket1?subtest=${subtest}`, {
      method: 'GET',
      accessToken,
      refreshToken,
      cache: 'no-store',
    })
  } catch (error) {
    const mappedError = mapSoalFetchError(
      error,
      'Gagal memuat soal. Silahkan coba lagi.'
    )

    console.error('Error fetching soal:', {
      subtest,
      soalUrl,
      message: mappedError.message,
    })

    throw mappedError
  }
}

export const syncTryout = async (
  jawaban: Jawaban[],
  accessToken?: string,
  isPublic?: boolean,
  refreshToken?: string
): Promise<any> => {
  try {
    const tryoutUrl = getTryoutUrl(isPublic)

    return await fetchJson<any>(`${tryoutUrl}/sync`, {
      method: 'POST',
      accessToken,
      refreshToken,
      body: {
        answers: jawaban,
      },
    })
  } catch (error) {
    const mappedError = mapTryoutSyncError(
      error,
      'Gagal menyinkronkan jawaban tryout. Silahkan coba lagi.'
    )
    console.error('Error syncing tryout:', mappedError)
    throw mappedError
  }
}

export const progressTryout = async (
  jawaban: Jawaban[],
  accessToken?: string,
  isPublic?: boolean,
  refreshToken?: string
): Promise<any> => {
  try {
    const tryoutUrl = getTryoutUrl(isPublic)

    return await fetchJson<any>(`${tryoutUrl}/sync/progress`, {
      method: 'POST',
      accessToken,
      refreshToken,
      body: {
        answers: jawaban,
      },
    })
  } catch (error) {
    const mappedError = mapTryoutSyncError(
      error,
      'Gagal memprogres tryout. Silahkan coba lagi.'
    )
    console.error('Error progressing tryout:', mappedError)
    throw mappedError
  }
}

export const startTryout = async (
  accessToken?: string,
  isPublic?: boolean
): Promise<any> => {
  try {
    const tryoutUrl = getTryoutUrl(isPublic)

    return await fetchJson<any>(`${tryoutUrl}/start-attempt/paket1`, {
      method: 'POST',
      accessToken,
    })
  } catch (error) {
    if (error instanceof ApiFetchError) {
      throw new Error(error.message || 'Failed to start tryout')
    }

    throw new Error(
      'Failed to start tryout: ' +
        (error instanceof Error ? error.message : 'Unknown error')
    )
  }
}
