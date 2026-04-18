import { cookies } from 'next/headers'
import * as motion from 'motion/react-client'
import { fetchUser } from '@/app/fetch_user'
import { getProgressOverview, getSubtestsProgress } from '@/lib/fetch/tryout-page'
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

  const [user, overview, subtestsProgress] = await Promise.all([
    fetchUser(),
    getProgressOverview(accessToken, refreshToken),
    getSubtestsProgress(accessToken, refreshToken),
  ])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'tween', duration: 0.25 }}
      className='flex flex-col gap-6 p-6 md:p-8'
    >
      <header className='flex items-center justify-between md:px-0 pt-5 px-4'>
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
            variant="outline"
            className="md:flex hidden items-center justify-center gap-2 py-[10px] px-10 rounded-[8px] border border-red-300 text-red-500 text-sm font-normal bg-transparent hover:bg-red-50 hover:text-red-500"
          >
            <LogOut className='h-4 w-4' />
            Log Out
          </Button>
        </LogOutDialog>
      </header>

      <div className='flex flex-col md:flex-row gap-5 md:p-6 p-[10px] bg-primary-100 rounded-[13px] shadow-[0_1.66px_3.319px_0_rgba(0,0,0,0.10)] max-h-screen h-full'>
        <div className='md:w-[45%] flex flex-col gap-5 md:gap-0 md:justify-between'>
          <ProfileCard user={user} />
          <StatistikCard
            overview={overview}
            subtestRows={subtestsProgress?.data?.rows || []}
          />
          <InsightCard
            overview={overview}
            subtestRows={subtestsProgress?.data?.rows || []}
          />
        </div>

        <div className='flex md:w-[55%] flex-col md:flex-1 gap-5 w-full'>
          <PeringkatNasional overview={overview} currentUsername={user?.username} />
          <CountdownSNBT utbk={overview?.data.utbk} />
        </div>

      </div>
    </motion.div>
  )
}

export default DashboardProgressPage