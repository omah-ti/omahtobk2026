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

    const cookieParts: string[] = []
    if (accessToken) {
      cookieParts.push(`access_token=${accessToken}`)
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
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
      return NextResponse.json(payload, { status: response.status })
    }

    const text = await response.text()
    return NextResponse.json(
      { error: text || 'Gagal memproses jawaban Career Match Up.' },
      { status: response.status }
    )
  } catch (error) {
    console.error('Error submitting CMU answers via API route:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengirim jawaban.' },
      { status: 500 }
    )
  }
}
