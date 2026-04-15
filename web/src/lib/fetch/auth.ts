import { PUBLIC_AUTH_URL } from '@/lib/types/url'

const AUTH_TIMEOUT_MS = 12000

const getAuthBaseUrl = () => {
  if (!PUBLIC_AUTH_URL) {
    throw new AuthRequestError(
      'Konfigurasi NEXT_PUBLIC_API_GATEWAY_URL belum diatur pada frontend.'
    )
  }

  return PUBLIC_AUTH_URL
}

export class AuthRequestError extends Error {
  status: number
  isTimeout: boolean

  constructor(message: string, status = 0, isTimeout = false) {
    super(message)
    this.name = 'AuthRequestError'
    this.status = status
    this.isTimeout = isTimeout
  }
}

type AuthRequestOptions = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: Record<string, unknown>
  fallbackMessage: string
  timeoutMs?: number
}

type LoginPayload = {
  email: string
  password: string
}

type RegisterPayload = {
  email: string
  nama_user: string
  password: string
  asal_sekolah: string
}

type ForgotPasswordPayload = {
  email: string
}

type ResetPasswordPayload = {
  reset_token: string
  new_password: string
}

type AuthMessageResponse = {
  message?: string
  error?: string
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const readResponseBody = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    try {
      return await response.json()
    } catch {
      return null
    }
  }

  try {
    const text = await response.text()
    if (!text) {
      return null
    }
    return { message: text }
  } catch {
    return null
  }
}

const extractBackendMessage = (payload: unknown): string | undefined => {
  if (typeof payload === 'string' && payload.trim()) {
    return payload
  }

  if (!isRecord(payload)) {
    return undefined
  }

  const message = payload.message
  if (typeof message === 'string' && message.trim()) {
    return message
  }

  const error = payload.error
  if (typeof error === 'string' && error.trim()) {
    return error
  }

  if (isRecord(error) && typeof error.message === 'string' && error.message.trim()) {
    return error.message
  }

  return undefined
}

const mapAuthErrorMessage = (
  status: number,
  backendMessage: string | undefined,
  fallbackMessage: string
): string => {
  switch (status) {
    case 400:
      return backendMessage || 'Permintaan tidak valid. Mohon cek kembali data yang kamu masukkan.'
    case 401:
      return backendMessage || 'Sesi atau kredensial tidak valid. Silakan login kembali.'
    case 403:
      return backendMessage || 'Akses ditolak untuk operasi ini.'
    case 404:
      return backendMessage || 'Endpoint auth tidak ditemukan.'
    case 409:
      return backendMessage || 'Data akun sudah terdaftar.'
    case 429:
      return backendMessage || 'Terlalu banyak percobaan. Silakan tunggu sebentar lalu coba lagi.'
    default:
      if (status >= 500) {
        return backendMessage || 'Server auth sedang bermasalah. Silakan coba lagi nanti.'
      }
      return backendMessage || fallbackMessage
  }
}

const authRequest = async <T>(
  path: string,
  { method, body, fallbackMessage, timeoutMs = AUTH_TIMEOUT_MS }: AuthRequestOptions
): Promise<T> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    }

    if (body) {
      headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(`${getAuthBaseUrl()}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
    })

    const payload = await readResponseBody(response)

    if (!response.ok) {
      const backendMessage = extractBackendMessage(payload)
      throw new AuthRequestError(
        mapAuthErrorMessage(response.status, backendMessage, fallbackMessage),
        response.status
      )
    }

    return (payload ?? {}) as T
  } catch (error) {
    if (error instanceof AuthRequestError) {
      throw error
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new AuthRequestError(
        'Permintaan ke server auth timeout. Silakan coba lagi.',
        408,
        true
      )
    }

    throw new AuthRequestError(
      'Terjadi gangguan jaringan saat menghubungi server auth. Silakan coba lagi.'
    )
  } finally {
    clearTimeout(timeout)
  }
}

export const loginAuth = async (payload: LoginPayload) => {
  return authRequest<AuthMessageResponse>('/login', {
    method: 'POST',
    body: payload,
    fallbackMessage: 'Login gagal. Silakan coba lagi.',
  })
}

export const registerAuth = async (payload: RegisterPayload) => {
  return authRequest<AuthMessageResponse>('/register', {
    method: 'POST',
    body: payload,
    fallbackMessage: 'Gagal membuat akun. Silakan coba lagi.',
  })
}

export const requestPasswordResetAuth = async (payload: ForgotPasswordPayload) => {
  return authRequest<AuthMessageResponse>('/request-password-reset', {
    method: 'POST',
    body: payload,
    fallbackMessage: 'Gagal mengirim email reset password. Silakan coba lagi.',
  })
}

export const resetPasswordAuth = async (payload: ResetPasswordPayload) => {
  return authRequest<AuthMessageResponse>('/reset-password', {
    method: 'POST',
    body: payload,
    fallbackMessage: 'Gagal mereset password. Silakan coba lagi.',
  })
}

export const logoutAuth = async () => {
  return authRequest<AuthMessageResponse>('/logout', {
    method: 'POST',
    fallbackMessage: 'Gagal logout. Silakan coba lagi.',
  })
}

export const getAuthErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof AuthRequestError) {
    return error.message
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}
