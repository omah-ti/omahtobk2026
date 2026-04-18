import { Trophy } from 'lucide-react'
import { ProgressOverviewResponse } from '@/lib/types/types'

type PeringkatNasionalProps = {
  overview: ProgressOverviewResponse
  currentUsername?: string
}

type RowVariant = 'gold' | 'neutral' | 'user'

function RankRow({
  rank,
  name,
  score,
  variant,
}: {
  rank: number | string
  name: string
  score: number | string
  variant: RowVariant
}) {
  const bg =
    variant === 'gold'
      ? 'bg-[#FFE59E]'
      : variant === 'user'
      ? 'bg-primary-200/30'
      : 'bg-neutral-200'

  return (
    <div className={`flex justify-between items-center p-3 rounded-[8px] ${bg}`}>
      <span className="text-sm font-normal leading-[21px] text-neutral-900 w-5 shrink-0">
        {rank}
      </span>
      <span className="text-sm font-normal leading-[21px] text-neutral-900 flex-1 pl-[45px]">
        {name}
      </span>
      <span className="text-sm font-bold leading-[21px] text-neutral-900 text-right">
        {score}
      </span>
    </div>
  )
}

const PeringkatNasional = ({ overview, currentUsername }: PeringkatNasionalProps) => {
  const leaderboard = overview?.data.leaderboard
  const top3 = leaderboard?.top_n?.slice(0, 3) ?? []
  const isEmpty = top3.length === 0
  const currentUserRank = leaderboard?.current_user_rank
  const currentUserScore = leaderboard?.current_user_score
  const fallbackName =
    currentUsername || overview?.data.profile.name || 'Kamu'

  return (
    <div className='bg-white w-full rounded-xl border border-neutral-100 p-3 flex flex-col gap-4 shadow-[0_2px_4px_0_rgba(0,0,0,0.08),0_3px_10px_0_rgba(0,0,0,0.10)]'>

      <div className="flex items-center gap-[12px]">
        <Trophy size={16} className='text-neutral-1000' />
        <span className="text-base font-bold text-neutral-1000">
          Peringkat Nasional
        </span>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center bg-[#E9EFFC] h-62">
          <p className="text-base font-bold text-black">
            Belum ada Peserta
          </p>
          <p className="text-[10px] text-neutral-500">Jadilah yang pertama</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-[12px]">
            {top3.map((entry, i) => (
              <RankRow
                key={entry.rank}
                rank={entry.rank || i + 1}
                name={entry.username || '–'}
                score={Math.round(entry.score)}
                variant={i === 0 ? 'gold' : 'neutral'}
              />
            ))}
          </div>
          <hr className="border-t border-neutral-200" />

          <div className="flex flex-col gap-[12px]">
            <span className="text-sm font-normal leading-[21px] text-neutral-900">
              Posisi kamu saat ini:
            </span>

            {currentUserRank != null ? (
              <RankRow
                rank={currentUserRank}
                name={fallbackName}
                score={
                  currentUserScore != null ? Math.round(currentUserScore) : '–'
                }
                variant="user"
              />
            ) : (
              <div className="flex items-center p-3 rounded-[8px] bg-primary-200/30">
                <span className="text-sm font-normal leading-[21px] text-neutral-900">
                  Kamu belum masuk leaderboard
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default PeringkatNasional