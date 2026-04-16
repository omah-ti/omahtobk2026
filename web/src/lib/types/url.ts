const normalizeUrl = (value?: string) => value?.trim().replace(/\/$/, '')

const FALLBACK_API_GATEWAY_URL = 'http://localhost:8080'

const internalApiGatewayUrl = normalizeUrl(process.env.API_GATEWAY_URL)
const publicApiGatewayUrl = normalizeUrl(process.env.NEXT_PUBLIC_API_GATEWAY_URL)

export const API_GATEWAY_URL =
	internalApiGatewayUrl || publicApiGatewayUrl || FALLBACK_API_GATEWAY_URL
export const PUBLIC_API_GATEWAY_URL =
	publicApiGatewayUrl || internalApiGatewayUrl || FALLBACK_API_GATEWAY_URL

export const TRYOUT_URL = `${API_GATEWAY_URL}/api/tryout`
export const AUTH_URL = `${API_GATEWAY_URL}/api/auth`
export const MINAT_BAKAT_URL = `${API_GATEWAY_URL}/api/minat-bakat`
export const SOAL_URL = `${API_GATEWAY_URL}/api/soal`

export const PUBLIC_TRYOUT_URL = `${PUBLIC_API_GATEWAY_URL}/api/tryout`
export const PUBLIC_AUTH_URL = `${PUBLIC_API_GATEWAY_URL}/api/auth`
export const PUBLIC_MINAT_BAKAT_URL = `${PUBLIC_API_GATEWAY_URL}/api/minat-bakat`
export const PUBLIC_SOAL_URL = `${PUBLIC_API_GATEWAY_URL}/api/soal`
