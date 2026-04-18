import DashboardHeader from '@/components/dashboard/header'
import ActivitySection from '@/modules/dashboard-home/activity-section'
import TryoutBanner from '@/modules/dashboard-home/tryout-banner'
import { fetchUser } from '@/app/fetch_user'
import {
  getFinishedAttempt,
  getOngoingAttempt,
  getSubtestsProgress,
} from '@/lib/fetch/tryout-page'
import { SubtestsProgressResponse } from '@/lib/types/types'
import { cookies } from 'next/headers'
import * as motion from 'motion/react-client'

const SUBTEST_SLUG_ROUTES: Record<string, string> = {
  subtest_pu: '/tryout/penalaran-umum',
  subtest_ppu: '/tryout/pengetahuan-dan-pemahaman-umum',
  subtest_pbm: '/tryout/pemahaman-bacaan-dan-menulis',
  subtest_pk: '/tryout/pengetahuan-kuantitatif',
  subtest_lbi: '/tryout/literasi-bahasa-indonesia',
  subtest_lbe: '/tryout/literasi-bahasa-inggris',
  subtest_pm: '/tryout/penalaran-matematika',
}

const resolveNextTryoutRoute = (progress: SubtestsProgressResponse): string => {
  const rows = progress?.data?.rows ?? []

  const isDone = (statusLabel: string) =>
    statusLabel.trim().toLowerCase() === 'selesai'

  const currentOpenRow = rows.find(
    (row) => row.is_current && !row.is_locked && !isDone(row.status_label)
  )

  const nextOpenRow = rows.find(
    (row) => !row.is_locked && !isDone(row.status_label)
  )

  const targetRow = currentOpenRow ?? nextOpenRow

  if (!targetRow) {
    return '/tryout/penalaran-umum'
  }

  return (
    SUBTEST_SLUG_ROUTES[targetRow.subtest_key] ||
    targetRow.action_route ||
    '/tryout/penalaran-umum'
  )
}

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
  const nextTryoutRoute = resolveNextTryoutRoute(subtestsProgress)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'tween', duration: 0.25 }}
      className='flex flex-col gap-6 p-1 md:p-8 bg-neutral-100'
    >
      <DashboardHeader user={user} hasOngoingTryout={!!ongoing} />

      <div className='md:p-6 p-[10px] bg-primary-100 rounded-[13px] gap-5 flex flex-col shadow-[0_1.66px_3.319px_0_rgba(0,0,0,0.08),0_2.489px_8.298px_0_rgba(0,0,0,0.10)]'>
        <TryoutBanner status={tryoutStatus} nextRoute={nextTryoutRoute} />
        <ActivitySection progress={subtestsProgress} />
      </div>
    </motion.div>
  )
}

export default DashboardHomePage
