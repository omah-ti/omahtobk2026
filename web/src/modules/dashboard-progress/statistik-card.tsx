import { TrendingUp } from 'lucide-react'
import { SubtestsScoreResponse } from '@/lib/types/types'

type StatistikCardProps = {
  score: SubtestsScoreResponse
}

const StatistikCard = ({ score }: StatistikCardProps) => {
  const subtests = score?.data ?? []
  const total = subtests.length
  const rataRata =
    total > 0
      ? Math.round(subtests.reduce((acc, s) => acc + s.score, 0) / total)
      : null

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
            {total} / 7 subtest
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
