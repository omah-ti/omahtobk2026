import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(_req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('refresh_token')?.value

    // clear cookies before communicating to auth service
    cookieStore.delete('access_token')
    cookieStore.delete('refresh_token')

    if (token) {
      try {
        await fetch(`${process.env.API_GATEWAY_URL}/api/auth/logout`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            Cookie: `refresh_token=${token}`, 
            'Content-Type': 'application/json',
          },

        })
      } catch (_error) {
        console.error('A network error occurred. Failed to notify server about logout.')
        // even if ts fails we still continue wit da process 💯💯
      }
    }

    return NextResponse.json({ message: 'Logged out successfully' })
  } catch (_error) {
    console.error('Error:', _error)
    return NextResponse.json({ error: 'Failed to logout' }, { status: 500 })
  }
}
