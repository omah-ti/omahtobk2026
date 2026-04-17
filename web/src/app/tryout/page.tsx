import Container from '@/components/container'
import TopBar from '@/components/tryout/top-bar'
import HistoryCard from '@/modules/tryout/dashboard/history-card'
import ProfileCard from '@/modules/tryout/dashboard/profile-card'
import RankingCard from '@/modules/tryout/dashboard/ranking-card'
import StartCard from '@/modules/tryout/dashboard/start-card'

import { fetchUser } from '@/lib/auth/fetch_user'
import {
  getFinishedAttempt,
  getLeaderboard,
  getOngoingAttempt,
  getSubtestsScore,
} from '@/lib/fetch/tryout-page'
import { getRequestAccessToken } from '@/lib/auth/request-token'
import * as motion from 'motion/react-client'

const TryOutPage = async () => {
  const accessToken = await getRequestAccessToken()
  const subtestsScore = await getSubtestsScore(accessToken)
  const leaderboard = await getLeaderboard(accessToken)
  const user = await fetchUser()
  const ongoing = await getOngoingAttempt(accessToken)
  const finished = await getFinishedAttempt(accessToken)

  return (
    <main className='min-h-screen bg-neutral-50'>
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'tween', duration: 0.2 }}
      >
        <Container>
          <TopBar />

          <motion.main
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'tween', duration: 0.2 }}
            className='flex flex-col gap-4'
          >
            <section className='flex flex-col-reverse gap-4 md:grid md:grid-cols-4'>
              <StartCard
                status={finished ? 'finished' : ongoing ? 'ongoing' : 'none'}
              />
              <ProfileCard user={user} />
            </section>
            <section className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <HistoryCard score={subtestsScore} />
              <RankingCard leaderboard={leaderboard} />
            </section>
          </motion.main>
        </Container>
      </motion.main>
    </main>
  )
}

export default TryOutPage
