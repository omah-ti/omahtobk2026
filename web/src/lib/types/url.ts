export const API_GATEWAY_URL = process.env.API_GATEWAY_URL as string
export const PUBLIC_API_GATEWAY_URL = process.env
	.NEXT_PUBLIC_API_GATEWAY_URL as string

export const TRYOUT_URL = `${API_GATEWAY_URL}/api/tryout`
export const AUTH_URL = `${API_GATEWAY_URL}/api/auth`
export const MINAT_BAKAT_URL = `${API_GATEWAY_URL}/api/minat-bakat`
export const SOAL_URL = `${API_GATEWAY_URL}/api/soal`

export const PUBLIC_TRYOUT_URL = `${PUBLIC_API_GATEWAY_URL}/api/tryout`
export const PUBLIC_AUTH_URL = `${PUBLIC_API_GATEWAY_URL}/api/auth`
export const PUBLIC_MINAT_BAKAT_URL = `${PUBLIC_API_GATEWAY_URL}/api/minat-bakat`
export const PUBLIC_SOAL_URL = `${PUBLIC_API_GATEWAY_URL}/api/soal`
