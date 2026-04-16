const DEFAULT_TIMEOUT_MS = 12000

export class ApiFetchError extends Error {
  status: number
  payload: unknown
  url: string
  isTimeout: boolean

  constructor(
    message: string,
    options: {
      status?: number
      payload?: unknown
      url: string
      isTimeout?: boolean
    }
  ) {
    super(message)
    this.name = 'ApiFetchError'
    this.status = options.status || 0
    this.payload = options.payload
    this.url = options.url
    this.isTimeout = options.isTimeout || false
  }
}

type FetchJsonOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: HeadersInit
  accessToken?: string
  refreshToken?: string
  credentials?: RequestCredentials
  cache?: RequestCache
  timeoutMs?: number
  fetchOptions?: RequestInit
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

export const buildCookieHeader = (
  accessToken?: string,
  refreshToken?: string
) => {
  const cookieParts: string[] = []

  if (accessToken) {
    cookieParts.push(`access_token=${accessToken}`)
  }

  if (refreshToken) {
    cookieParts.push(`refresh_token=${refreshToken}`)
  }

  return cookieParts.join('; ')
}

export const extractApiMessage = (payload: unknown): string | undefined => {
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

const parseResponsePayload = async (response: Response): Promise<unknown> => {
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
    return text || null
  } catch {
    return null
  }
}

export const fetchJson = async <T>(
  url: string,
  {
    method = 'GET',
    body,
    headers,
    accessToken,
    refreshToken,
    credentials = 'include',
    cache = 'no-store',
    timeoutMs = DEFAULT_TIMEOUT_MS,
    fetchOptions,
  }: FetchJsonOptions = {}
): Promise<T> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  const requestHeaders = new Headers(headers)
  const cookieHeader = buildCookieHeader(accessToken, refreshToken)

  requestHeaders.set('Accept', 'application/json')
  if (body !== undefined) {
    requestHeaders.set('Content-Type', 'application/json')
  }
  if (cookieHeader && !requestHeaders.has('Cookie')) {
    requestHeaders.set('Cookie', cookieHeader)
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials,
      cache,
      signal: controller.signal,
    })

    const payload = await parseResponsePayload(response)
    if (!response.ok) {
      throw new ApiFetchError(
        extractApiMessage(payload) || 'Permintaan API gagal.',
        {
          status: response.status,
          payload,
          url,
        }
      )
    }

    return (payload ?? {}) as T
  } catch (error) {
    if (error instanceof ApiFetchError) {
      throw error
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiFetchError('Permintaan API timeout. Silakan coba lagi.', {
        status: 408,
        url,
        isTimeout: true,
      })
    }

    throw new ApiFetchError(
      'Terjadi gangguan jaringan saat menghubungi server. Silakan coba lagi.',
      {
        url,
      }
    )
  } finally {
    clearTimeout(timeout)
  }
}
