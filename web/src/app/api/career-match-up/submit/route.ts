import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

type SubmitPayload = {
  assessment_version?: string
  answers?: Array<{
    question_id?: number
    kode_soal?: string
    likert_value: number
  }>
}

const MB_GUEST_COOKIE_KEY = 'mb_guest_id'

const generateGuestId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.API_GATEWAY_URL) {
      return NextResponse.json(
        { error: 'API gateway belum dikonfigurasi.' },
        { status: 500 }
      )
    }

    const body = (await req.json()) as SubmitPayload
    if (!Array.isArray(body?.answers) || body.answers.length === 0) {
      return NextResponse.json(
        { error: 'Jawaban tidak valid.' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    let guestId = (cookieStore.get(MB_GUEST_COOKIE_KEY)?.value || '').trim()
    if (!guestId || guestId.length > 128) {
      guestId = generateGuestId()
    }

    const cookieParts: string[] = []
    if (accessToken) {
      cookieParts.push(`access_token=${accessToken}`)
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Guest-ID': guestId,
    }

    if (cookieParts.length > 0) {
      headers.Cookie = cookieParts.join('; ')
    }

    const response = await fetch(
      `${process.env.API_GATEWAY_URL}/api/minat-bakat/process`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        cache: 'no-store',
      }
    )

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const payload = await response.json()
      const responsePayload =
        payload && typeof payload === 'object'
          ? { ...payload, guest_id: guestId }
          : { data: payload, guest_id: guestId }

      const clientResponse = NextResponse.json(responsePayload, {
        status: response.status,
      })
      clientResponse.cookies.set({
        name: MB_GUEST_COOKIE_KEY,
        value: guestId,
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: false,
      })
      return clientResponse
    }

    const text = await response.text()
    const clientResponse = NextResponse.json(
      { error: text || 'Gagal memproses jawaban Career Match Up.' },
      { status: response.status }
    )
    clientResponse.cookies.set({
      name: MB_GUEST_COOKIE_KEY,
      value: guestId,
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false,
    })

    return clientResponse
  } catch (error) {
    console.error('Error submitting CMU answers via API route:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengirim jawaban.' },
      { status: 500 }
    )
  }
}
