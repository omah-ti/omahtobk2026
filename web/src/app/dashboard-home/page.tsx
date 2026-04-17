import DashboardHeader from '@/components/dashboard-home/header'
import ActivitySection from '@/modules/dashboard-home/activity-section'
import TryoutBanner from '@/modules/dashboard-home/tryout-banner'
import { fetchUser } from '@/app/fetch_user'
import {
  getFinishedAttempt,
  getOngoingAttempt,
  getSubtestsProgress,
} from '@/lib/fetch/tryout-page'
import { cookies } from 'next/headers'
import * as motion from 'motion/react-client'

const DashboardHomePage = async () => {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value as string
  const refreshToken = cookieStore.get('refresh_token')?.value as string

  const [user, subtestsProgress, ongoing, finished] = await Promise.all([
    fetchUser(),
    getSubtestsProgress(accessToken, refreshToken),
    getOngoingAttempt(accessToken, refreshToken),
    getFinishedAttempt(accessToken, refreshToken),
  ])

  const tryoutStatus = finished ? 'finished' : ongoing ? 'ongoing' : 'none'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'tween', duration: 0.25 }}
      className='flex flex-col gap-6 p-6 md:p-8'
    >
      <DashboardHeader user={user} hasOngoingTryout={!!ongoing} />

      <TryoutBanner status={tryoutStatus} />

      <ActivitySection progress={subtestsProgress} />
    </motion.div>
  )
}

export default DashboardHomePage
