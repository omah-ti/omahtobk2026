import Container from '@/components/container'
import TopBar from '@/components/tryout/top-bar'
import { getFinishedAttempt } from '@/lib/fetch/tryout-page'
import { getCurrentTryout, getSoal, startSubtest } from '@/lib/fetch/tryout-test'
import NumberCarousel from '@/modules/tryout/number-carousel'
import TryoutStatus from '@/modules/tryout/tryout-status'
import { redirect } from 'next/navigation'
import { TryoutDataProvider } from './tryout-context'
import { fetchUser } from '@/app/fetch_user'
import * as motion from 'motion/react-client'
import { getRequestAccessToken } from '@/lib/auth/request-token'

const TryoutLayout = async ({ children }: { children: React.ReactNode }) => {
  const accessToken = await getRequestAccessToken()
  const finishedAttempt = await getFinishedAttempt(accessToken)
  if (finishedAttempt) {
    redirect('/dashboard-home')
  }
  const currentSubtest = await getCurrentTryout(accessToken)
  if (currentSubtest == null) {
    redirect('/tryout/intro')
  }
  const subtestSekarang = currentSubtest.data.subtest_sekarang
  let subtestData
  try {
    subtestData = await startSubtest(subtestSekarang, accessToken)
  } catch (error) {
    console.error('Failed to start subtest in layout:', error)
    redirect('/dashboard-home?error=start-subtest-failed')
  }
  const timeLimit = subtestData.data.time_limit
  const initialAnswers = subtestData.data.answers || []
  const grace = 60_000
  const adjustedTimeLimit = new Date(new Date(timeLimit).getTime() - grace)
  let soal
  try {
    soal = await getSoal(currentSubtest.data.subtest_sekarang, accessToken)
  } catch (error) {
    console.error('Failed to fetch soal in layout:', error)
    redirect('/dashboard-home?error=soal-fetch-failed')
  }

  const user = await fetchUser()
  const panjangSoal = soal.length

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'tween', duration: 0.15 }}
      className='bg-neutral-25 min-h-screen'
    >
      <Container>
        <TryoutDataProvider
          currentSubtest={subtestSekarang}
          value={soal}
          time={adjustedTimeLimit}
          initialAnswers={initialAnswers}
        >
          <TopBar />
          <TryoutStatus
            user={user}
            time={adjustedTimeLimit}
            title={subtestSekarang}
          />
          <NumberCarousel totalQuestions={panjangSoal} />
          {children}
        </TryoutDataProvider>
      </Container>
    </motion.main>
  )
}

export default TryoutLayout
