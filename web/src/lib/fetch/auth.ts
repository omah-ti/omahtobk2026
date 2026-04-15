import { PUBLIC_AUTH_URL } from '@/lib/types/url'
import { ApiFetchError, fetchJson } from '@/lib/fetch/http'

const AUTH_TIMEOUT_MS = 12000

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

const getAuthBaseUrl = () => {
  if (!PUBLIC_AUTH_URL) {
    throw new AuthRequestError(
      'Konfigurasi NEXT_PUBLIC_API_GATEWAY_URL belum diatur pada frontend.'
    )
  }

  return PUBLIC_AUTH_URL
}

const mapAuthErrorMessage = (
  status: number,
  backendMessage: string | undefined,
  fallbackMessage: string
): string => {
  switch (status) {
    case 400:
      return (
        backendMessage ||
        'Permintaan tidak valid. Mohon cek kembali data yang kamu masukkan.'
      )
    case 401:
      return (
        backendMessage ||
        'Sesi atau kredensial tidak valid. Silakan login kembali.'
      )
    case 403:
      return backendMessage || 'Akses ditolak untuk operasi ini.'
    case 404:
      return backendMessage || 'Endpoint auth tidak ditemukan.'
    case 409:
      return backendMessage || 'Data akun sudah terdaftar.'
    case 429:
      return (
        backendMessage ||
        'Terlalu banyak percobaan. Silakan tunggu sebentar lalu coba lagi.'
      )
    default:
      if (status >= 500) {
        return (
          backendMessage ||
          'Server auth sedang bermasalah. Silakan coba lagi nanti.'
        )
      }

      return backendMessage || fallbackMessage
  }
}

const mapAuthFetchError = (error: unknown, fallbackMessage: string) => {
  if (error instanceof AuthRequestError) {
    return error
  }

  if (error instanceof ApiFetchError) {
    return new AuthRequestError(
      mapAuthErrorMessage(error.status, error.message, fallbackMessage),
      error.status,
      error.isTimeout
    )
  }

  if (error instanceof Error && error.message.trim()) {
    return new AuthRequestError(error.message)
  }

  return new AuthRequestError(fallbackMessage)
}

const authRequest = async <T>(
  path: string,
  options: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    body?: Record<string, unknown>
    fallbackMessage: string
    timeoutMs?: number
  }
): Promise<T> => {
  try {
    return await fetchJson<T>(`${getAuthBaseUrl()}${path}`, {
      method: options.method,
      body: options.body,
      timeoutMs: options.timeoutMs || AUTH_TIMEOUT_MS,
      cache: 'no-store',
    })
  } catch (error) {
    throw mapAuthFetchError(error, options.fallbackMessage)
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

export const requestPasswordResetAuth = async (
  payload: ForgotPasswordPayload
) => {
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
