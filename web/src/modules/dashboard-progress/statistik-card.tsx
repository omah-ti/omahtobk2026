import { Activity } from 'lucide-react'
import {
  ProgressOverviewResponse,
  SubtestsProgressRow,
} from '@/lib/types/types'

type StatistikCardProps = {
  overview: ProgressOverviewResponse
  subtestRows?: SubtestsProgressRow[]
}

const StatistikCard = ({ overview, subtestRows = [] }: StatistikCardProps) => {
  const statistics = overview?.data.statistics
  const rataRata =
    statistics && statistics.completed_subtests > 0
      ? Math.round(statistics.average_score)
      : null

  const totalSubtests =
    subtestRows.length > 0
      ? subtestRows.length
      : (statistics?.total_subtests ?? 7)

  const completedSubtests =
    subtestRows.length > 0
      ? subtestRows.filter((row) => row.score_value !== null).length
      : (statistics?.completed_subtests ?? 0)

  const progressText = `${completedSubtests}/${totalSubtests} subtest`

  return (
    <div className='bg-white w-full rounded-xl border border-neutral-100 p-5 flex flex-col gap-4 shadow-[0_2px_4px_0_rgba(0,0,0,0.08),0_3px_10px_0_rgba(0,0,0,0.10)]'>
      <div className='flex items-center gap-2'>
        <Activity size={16} className='text-primary-400' />
        <span className='text-base font-bold text-neutral-1000'>Statistik</span>
      </div>

      <div className='flex flex-row gap-3 text-neutral-1000 w-full'>
        <div className='rounded-xl w-fit md:w-full p-3 flex flex-col gap-1 bg-[#E9EFFC]'>
          <p className='text-xs whitespace-nowrap'>Rata-Rata Nilai</p>
          <p className='text-2xl font-bold '>
            {rataRata ?? '–'}
          </p>
        </div>
        <div className='rounded-xl w-full p-3 flex flex-col gap-1 bg-[#E9EFFC]'>
          <p className='text-xs'>Progres Try Out</p>
          <p className='text-2xl font-bold '>
            {progressText}
          </p>
        </div>
      </div>

      <p className='text-xs text-neutral-1000'>
        Tingkatkan terus nilaimu untuk mencapai kampus impian!
      </p>
    </div>
  )
}

export default StatistikCard
