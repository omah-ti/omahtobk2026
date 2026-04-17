import { Circle } from 'lucide-react'
import {
  ProgressOverviewResponse,
  SubtestsProgressRow,
} from '@/lib/types/types'

type InsightCardProps = {
  overview: ProgressOverviewResponse
  subtestRows?: SubtestsProgressRow[]
}

const formatInsightScoreValue = (
  score: number | null | undefined,
  scoreText?: string
) => {
  if (typeof score === 'number' && Number.isFinite(score)) {
    return Math.round(score)
  }

  if (typeof scoreText === 'string') {
    const match = scoreText.match(/-?\d+(?:\.\d+)?/)
    if (match) {
      const parsed = Number(match[0])
      if (Number.isFinite(parsed)) {
        return Math.round(parsed)
      }
    }
  }

  return null
}

const InsightCard = ({ overview, subtestRows = [] }: InsightCardProps) => {
  const insight = overview?.data.insight
  const terkuat = insight?.strongest_subtest

  const fokusFromRows = subtestRows.reduce<SubtestsProgressRow | null>(
    (lowest, row) => {
      if (typeof row.score_value !== 'number') {
        return lowest
      }

      if (!lowest || row.score_value < (lowest.score_value ?? Number.POSITIVE_INFINITY)) {
        return row
      }

      return lowest
    },
    null
  )

  const fokus = fokusFromRows
    ? {
        subtest_name: fokusFromRows.subtest_name,
        score: fokusFromRows.score_value,
        score_text: fokusFromRows.score_text,
      }
    : insight?.focus_subtest

  const terkuatScore = formatInsightScoreValue(terkuat?.score, terkuat?.score_text)
  const fokusScore = formatInsightScoreValue(fokus?.score, fokus?.score_text)

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
            {terkuat?.subtest_name
              ? `${terkuat.subtest_name}${terkuatScore !== null ? ` (${terkuatScore})` : ''}`
              : '–'}
          </p>
        </div>
        <div className='bg-primary-50 rounded-xl p-3 flex flex-col gap-1'>
          <p className='text-xs text-neutral-400'>Fokus Tingkatkan</p>
          <p className='text-sm font-semibold text-neutral-900'>
            {fokus?.subtest_name
              ? `${fokus.subtest_name}${fokusScore !== null ? ` (${fokusScore})` : ''}`
              : '–'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default InsightCard
