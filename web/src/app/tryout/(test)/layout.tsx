import Container from '@/components/container'
import TopBar from '@/components/tryout/top-bar'
import { getFinishedAttempt } from '@/lib/fetch/tryout-page'
import { getCurrentTryout, getSoal, syncTryout } from '@/lib/fetch/tryout-test'
import NumberCarousel from '@/modules/tryout/number-carousel'
import TryoutStatus from '@/modules/tryout/tryout-status'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { TryoutDataProvider } from './tryout-context'
import { fetchUser } from '@/app/fetch_user'
import * as motion from 'motion/react-client'

const TryoutLayout = async ({ children }: { children: React.ReactNode }) => {
  const accessToken = (await cookies()).get('access_token')?.value as string
  const refreshToken = (await cookies()).get('refresh_token')?.value as string
  const finishedAttempt = await getFinishedAttempt(accessToken)
  if (finishedAttempt) {
    redirect('/tryout')
  }
  const currentSubtest = await getCurrentTryout(accessToken, undefined, refreshToken)
  if (currentSubtest == null) {
    redirect('/tryout')
  }
  const syncData = await syncTryout([], accessToken, undefined, refreshToken)
  if (syncData == null) {
    redirect('/tryout?error=sync-failed')
  }
  const timeLimit = syncData.data.time_limit
  const grace = 60_000
  const adjustedTimeLimit = new Date(new Date(timeLimit).getTime() - grace)
  const subtestSekarang = currentSubtest.data.subtest_sekarang
  let soal
  try {
    soal = await getSoal(
      currentSubtest.data.subtest_sekarang,
      accessToken,
      undefined,
      refreshToken
    )
  } catch (error) {
    console.error('Failed to fetch soal in layout:', error)
    redirect('/tryout?error=soal-fetch-failed')
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
