import { cookies, headers } from 'next/headers'

const ACCESS_TOKEN_HEADER = 'x-auth-access-token'

export const getRequestAccessToken = async () => {
  const headersList = await headers()
  const accessTokenFromHeader = headersList.get(ACCESS_TOKEN_HEADER)
  if (accessTokenFromHeader) {
    return accessTokenFromHeader
  }

  const cookieStore = await cookies()
  return cookieStore.get('access_token')?.value
}
