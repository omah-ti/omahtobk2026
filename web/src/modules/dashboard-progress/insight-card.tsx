import { Circle } from 'lucide-react'
import { SubtestsScoreResponse } from '@/lib/types/types'

type InsightCardProps = {
  score: SubtestsScoreResponse
}

const InsightCard = ({ score }: InsightCardProps) => {
  const subtests = score?.data ?? []

  const terkuat =
    subtests.length > 0
      ? subtests.reduce((a, b) => (a.score > b.score ? a : b))
      : null

  const terlemah =
    subtests.length > 0
      ? subtests.reduce((a, b) => (a.score < b.score ? a : b))
      : null

  return (
    <div className='bg-white rounded-2xl border border-neutral-100 p-5 flex flex-col gap-4'>
      <div className='flex items-center gap-2'>
        <Circle size={16} className='text-primary-400 fill-primary-400' />
        <span className='text-sm font-semibold text-neutral-900'>Insight</span>
      </div>

      <div className='flex flex-col gap-3'>
        <div className='bg-primary-50 rounded-xl p-3 flex flex-col gap-1'>
          <p className='text-xs text-neutral-400'>Subtest Terkuat</p>
          <p className='text-sm font-semibold text-neutral-900'>
            {terkuat ? `${terkuat.subtest} (${terkuat.score})` : '–'}
          </p>
        </div>
        <div className='bg-primary-50 rounded-xl p-3 flex flex-col gap-1'>
          <p className='text-xs text-neutral-400'>Fokus Tingkatkan</p>
          <p className='text-sm font-semibold text-neutral-900'>
            {terlemah ? `${terlemah.subtest} (${terlemah.score})` : '–'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default InsightCard
