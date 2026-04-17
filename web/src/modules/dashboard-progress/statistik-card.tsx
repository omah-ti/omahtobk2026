import { TrendingUp } from 'lucide-react'
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

  const progressText = `${completedSubtests} / ${totalSubtests} subtest`

  return (
    <div className='bg-white rounded-2xl border border-neutral-100 p-5 flex flex-col gap-4'>
      <div className='flex items-center gap-2'>
        <TrendingUp size={16} className='text-primary-400' />
        <span className='text-sm font-semibold text-neutral-900'>Statistik</span>
      </div>

      <div className='grid grid-cols-2 gap-3'>
        <div className='bg-primary-50 rounded-xl p-3 flex flex-col gap-1'>
          <p className='text-xs text-neutral-400'>Rata-Rata Nilai</p>
          <p className='text-2xl font-bold text-neutral-900'>
            {rataRata ?? '–'}
          </p>
        </div>
        <div className='bg-primary-50 rounded-xl p-3 flex flex-col gap-1'>
          <p className='text-xs text-neutral-400'>Progres Try Out</p>
          <p className='text-2xl font-bold text-neutral-900'>
            {progressText}
          </p>
        </div>
      </div>

      <p className='text-xs text-neutral-400'>
        Tingkatkan terus nilaimu untuk mencapai kampus impian!
      </p>
    </div>
  )
}

export default StatistikCard
