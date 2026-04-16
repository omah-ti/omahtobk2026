import CareerMatchUpTest from '@/modules/career-match-up/career-test'
import { cookies } from 'next/headers'
import { getMbAttempt, getMbQuestions } from '@/lib/fetch/mb-fetch'
import { redirect } from 'next/navigation'
import NavbarResolver from '@/components/home/navbar-resolver'
import Footer from '@/modules/home/footer'

const UI_ONLY_TEST_MODE = process.env.NEXT_PUBLIC_CMU_UI_ONLY === 'false'

const MOCK_QUESTIONS = [
  {
    kode_soal: 'mock-001',
    statement: 'Aktivitas mana yang paling kamu nikmati?',
  },
  {
    kode_soal: 'mock-002',
    statement: 'Lingkungan kerja seperti apa yang paling cocok untukmu?',
  },
  {
    kode_soal: 'mock-003',
    statement: 'Apa yang paling kamu minati dalam pekerjaan?',
  },
  {
    kode_soal: 'mock-004',
    statement: 'Apa yang paling kamu apalah itu?',
  },
  {
    kode_soal: 'mock-005',
    statement: 'Saya bikin pertanyaan ini sambil nahan lapar, kamu lapar ga?',
  },
]

async function Page() {
  if (UI_ONLY_TEST_MODE) {
    return (
      <div className='flex flex-col items-center justify-center w-full'>
        <NavbarResolver />
        <CareerMatchUpTest questions={MOCK_QUESTIONS} />
      </div>
    )
  }

  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value
  const attempt = await getMbAttempt(accessToken, false)
  if (attempt) {
    redirect('/career-match-up/result')
  }

  try {
    const questionsData = await getMbQuestions(accessToken)
    return (
      <div className='flex flex-col items-center justify-center'>
        <CareerMatchUpTest questions={questionsData} />
        <Footer />
      </div>
    )
  } catch (error) {
    console.error('Failed to fetch questions:', error)
    return (
      <div className='flex flex-1 flex-col items-center justify-center'>
        <h2 className='mb-4 text-xl font-semibold'>Error</h2>
        <p>Failed to load career questions. Please try again later.</p>
      </div>
    )
  }
}

export default Page
