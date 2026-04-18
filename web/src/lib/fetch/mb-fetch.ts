import {
    MINAT_BAKAT_URL,
    PUBLIC_MINAT_BAKAT_URL,
    PUBLIC_SOAL_URL,
    SOAL_URL,
} from '@/lib/types/url'

export type MbQuestion = {
    question_id?: number
    kode_soal: string
    statement?: string
    text_soal?: string
    dimension?: string
    reverse_scored?: boolean
    is_active?: boolean
}

export type MbSubmitAnswer = {
    question_id?: number
    kode_soal?: string
    likert_value: number
}

export type MbSubmitPayload = {
    assessment_version?: string
    answers: MbSubmitAnswer[]
}

export type MbResult = {
    attempt_id: number
    user_id: number
    dna_it_top: string
    confidence: number
    total_questions: number
    assessment_version: string
    scoring_version: string
    dimension_scores: Record<string, number>
    role_scores: Record<string, number>
    created_at: string
}

export type MbAttempt = {
    attempt_id: number
    user_id: number
    bakat_user: string
    created_at: string
}

const MB_GUEST_COOKIE_KEY = 'mb_guest_id'

const readCookieValue = (key: string): string | undefined => {
    if (typeof document === 'undefined') {
        return undefined
    }

    const encodedKey = `${encodeURIComponent(key)}=`
    const parts = document.cookie.split(';')
    for (const part of parts) {
        const trimmed = part.trim()
        if (!trimmed.startsWith(encodedKey)) {
            continue
        }

        const value = trimmed.slice(encodedKey.length)
        return value ? decodeURIComponent(value) : undefined
    }

    return undefined
}

const generateGuestId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }

    return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const ensureBrowserGuestId = (): string | undefined => {
    if (typeof document === 'undefined') {
        return undefined
    }

    const existing = readCookieValue(MB_GUEST_COOKIE_KEY)
    if (existing) {
        return existing
    }

    const generated = generateGuestId()
    document.cookie = `${MB_GUEST_COOKIE_KEY}=${encodeURIComponent(generated)}; Path=/; Max-Age=31536000; SameSite=Lax`
    return generated
}

const resolveGuestId = (guestId?: string) => {
    const explicit = (guestId || '').trim()
    if (explicit) {
        return explicit
    }

    return ensureBrowserGuestId()
}

const cookieHeaders = (
    accessToken?: string,
    refreshToken?: string,
    guestId?: string
) => {
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

    const resolvedGuestId = resolveGuestId(guestId)
    if (resolvedGuestId) {
        headers['X-Guest-ID'] = resolvedGuestId
    }

    return headers
}

const parseErrorMessage = async (res: Response, fallback: string) => {
    try {
        const contentType = res.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
            const payload = await res.json()
            return payload?.message || payload?.error || fallback
        }

        const text = await res.text()
        return text || fallback
    } catch {
        return fallback
    }
}

export const getMbUrl = (isPublic?: boolean) => {
    return isPublic ? PUBLIC_MINAT_BAKAT_URL : MINAT_BAKAT_URL
}

export const getSoalUrl = (isPublic?: boolean) => {
    return isPublic ? PUBLIC_SOAL_URL : SOAL_URL
}

export const getMbQuestions = async (
    accessToken?: string,
    isPublic?: boolean,
    refreshToken?: string,
    paging?: {
        limit?: number
        offset?: number
    },
    guestId?: string
): Promise<MbQuestion[]> => {
    try {
        const mbUrl = getMbUrl(isPublic)
        const query = new URLSearchParams()
        if (paging?.limit !== undefined) {
            query.set('limit', String(paging.limit))
        }
        if (paging?.offset !== undefined) {
            query.set('offset', String(paging.offset))
        }

        const requestUrl = query.toString()
            ? `${mbUrl}/questions?${query.toString()}`
            : `${mbUrl}/questions`

        const res = await fetch(requestUrl, {
            method: 'GET',
            headers: cookieHeaders(accessToken, refreshToken, guestId),
            credentials: 'include',
            cache: 'force-cache',
            next: { revalidate: 1800 },
        })

        if (!res.ok) {
            throw new Error(
                await parseErrorMessage(res, 'Gagal mengambil pertanyaan Career Match Up.')
            )
        }

        const payload = await res.json()
        const questions = Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload)
                ? payload
                : []

        return questions
    } catch (error) {
        console.error('Error fetching MB questions:', error)
        throw error instanceof Error
            ? error
            : new Error('Gagal mengambil pertanyaan Career Match Up.')
    }
}

// Compatibility helper for old callers.
export const getMbSoal = getMbQuestions

export const submitMbAnswers = async (
    payload: MbSubmitPayload,
    isPublic?: boolean,
    accessToken?: string,
    refreshToken?: string,
    guestId?: string
) => {
    try {
        const mbUrl = getMbUrl(isPublic)
        const res = await fetch(`${mbUrl}/process`, {
            method: 'POST',
            headers: cookieHeaders(accessToken, refreshToken, guestId),
            credentials: 'include',
            cache: 'no-store',
            body: JSON.stringify(payload),
        })

        if (!res.ok) {
            throw new Error(
                await parseErrorMessage(res, 'Gagal mengirim jawaban Career Match Up.')
            )
        }

        return res.json()
    } catch (error) {
        console.error('Error submitting MB answers:', error)
        throw error instanceof Error
            ? error
            : new Error('Gagal mengirim jawaban Career Match Up.')
    }
}

export const getMbAttempt = async (
    accessToken?: string,
    isPublic?: boolean,
    refreshToken?: string,
    guestId?: string
): Promise<MbAttempt | null> => {
    try {
        const mbUrl = getMbUrl(isPublic)
        const res = await fetch(`${mbUrl}/attempt`, {
            method: 'GET',
            headers: cookieHeaders(accessToken, refreshToken, guestId),
            credentials: 'include',
            cache: 'no-store',
        })

        if (!res.ok) {
            return null
        }

        return res.json()
    } catch (error) {
        console.error('Error fetching MB attempt:', error)
        return null
    }
}

export const getMbLatestResult = async (
    accessToken?: string,
    isPublic?: boolean,
    refreshToken?: string,
    guestId?: string
): Promise<MbResult | null> => {
    try {
        const mbUrl = getMbUrl(isPublic)
        const res = await fetch(`${mbUrl}/result/latest`, {
            method: 'GET',
            headers: cookieHeaders(accessToken, refreshToken, guestId),
            credentials: 'include',
            cache: 'no-store',
        })

        if (!res.ok) {
            return null
        }

        const payload = await res.json()
        return payload?.data ?? null
    } catch (error) {
        console.error('Error fetching MB latest result:', error)
        return null
    }
}
