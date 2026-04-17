import { BarChart2 } from 'lucide-react'
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
    <div className="flex flex-col gap-[14px] p-5 bg-neutral-100 border border-neutral-200 rounded-[8px] shadow-[0_2px_4px_0_rgba(0,0,0,0.05)] self-stretch">

      <div className="flex items-center gap-[12px]">
        <BarChart2 size={16} strokeWidth={1.5} color="#000000" />
        <span className="text-base font-bold leading-[24px] text-neutral-900">
          Peringkat Nasional
        </span>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center bg-primary-50 rounded-xl py-10 gap-2">
          <p className="text-sm font-semibold text-neutral-900 opacity-50">
            Belum ada Peserta
          </p>
          <p className="text-xs text-neutral-900 opacity-40">jadilah yang pertama</p>
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