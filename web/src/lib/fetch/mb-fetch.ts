import {
  MINAT_BAKAT_URL,
  PUBLIC_MINAT_BAKAT_URL,
  PUBLIC_SOAL_URL,
  SOAL_URL,
} from '@/lib/types/url'
import { fetchJson } from '@/lib/fetch/http'

export const getMbUrl = (isPublic?: boolean) => {
  return isPublic ? PUBLIC_MINAT_BAKAT_URL : MINAT_BAKAT_URL
}

export const getSoalUrl = (isPublic?: boolean) => {
  return isPublic ? PUBLIC_SOAL_URL : SOAL_URL
}

export const getMbSoal = async (
  accessToken?: string,
  isPublic?: boolean
): Promise<any> => {
  try {
    const soalUrl = getSoalUrl(isPublic)

    return await fetchJson<any>(`${soalUrl}/minat-bakat`, {
      method: 'GET',
      accessToken,
      cache: 'force-cache',
      fetchOptions: {
        next: { revalidate: 3600 },
      },
    })
  } catch (error) {
    console.error('Error fetching MB soal:', error)
    throw new Error('Failed to fetch soal')
  }
}

export const submitMbAnswers = async (
  answers: unknown,
  isPublic?: boolean,
  accessToken?: string
): Promise<any> => {
  try {
    const mbUrl = getMbUrl(isPublic)

    return await fetchJson<any>(`${mbUrl}/process`, {
      method: 'POST',
      accessToken,
      body: answers,
    })
  } catch (error) {
    console.error('Error submitting MB answers:', error)
    throw new Error('Failed to submit answers')
  }
}

export const getMbAttempt = async (
  accessToken?: string,
  isPublic?: boolean
): Promise<any | null> => {
  try {
    const mbUrl = getMbUrl(isPublic)

    return await fetchJson<any>(`${mbUrl}/attempt`, {
      method: 'GET',
      accessToken,
      cache: 'force-cache',
      fetchOptions: {
        next: { revalidate: 3600 },
      },
    })
  } catch (error) {
    console.error('Error fetching MB attempt:', error)
    return null
  }
}
