import { cookies } from 'next/headers'
import * as motion from 'motion/react-client'
import { fetchUser } from '@/app/fetch_user'
import { getSubtestsScore, getLeaderboard } from '@/lib/fetch/tryout-page'
import LogOutDialog from '@/components/log-out-dialog'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import ProfileCard from '@/modules/dashboard-progress/profile-card'
import StatistikCard from '@/modules/dashboard-progress/statistik-card'
import InsightCard from '@/modules/dashboard-progress/insight-card'
import PeringkatNasional from '@/modules/dashboard-progress/peringkat-nasional'
import CountdownSNBT from '@/modules/dashboard-progress/countdown-snbt'

const DashboardProgressPage = async () => {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value as string
  const refreshToken = cookieStore.get('refresh_token')?.value as string

  const [user, score, leaderboard] = await Promise.all([
    fetchUser(),
    getSubtestsScore(accessToken, refreshToken),
    getLeaderboard(accessToken, refreshToken),
  ])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'tween', duration: 0.25 }}
      className='flex flex-col gap-6 p-6 md:p-8'
    >
      <header className='flex items-center justify-between'>
        <div className='flex flex-col gap-[3px]'>
          <h1 className='text-2xl font-bold text-neutral-900'>
            Pantau progres dan performamu
          </h1>
          <p className='text-base font-normal leading-6 text-neutral-500'>
            Lihat statistik dan peringkat nasional menuju SNBT 2026.
          </p>
        </div>

        <LogOutDialog>
          <Button
            variant='outline'
            className='hidden md:flex h-auto gap-2 rounded-lg border border-red-300 px-4 py-2.5 text-sm font-medium text-error-600 shadow-xs hover:bg-red-50 hover:text-error-600'
          >
            <LogOut className='h-4 w-4' />
            Log Out
          </Button>
        </LogOutDialog>
      </header>

      <div className='flex flex-col md:flex-row md:justify-between md:items-start md:gap-14 gap-5 p-6 rounded-[13px] bg-primary-50 shadow-[0_1.66px_3.319px_0_rgba(0,0,0,0.03)]'>

        <div className='flex flex-col gap-5 md:w-[422px] md:shrink-0'>
          <ProfileCard user={user} />
          <StatistikCard score={score} />
          <InsightCard score={score} />
        </div>

        <div className='flex flex-col gap-5 md:flex-1'>
          <PeringkatNasional leaderboard={leaderboard} user={user} />
          <CountdownSNBT />
        </div>

      </div>
    </motion.div>
  )
}

export default DashboardProgressPage