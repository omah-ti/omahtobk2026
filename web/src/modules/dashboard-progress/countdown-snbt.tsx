'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { ProgressOverviewUTBK } from '@/lib/types/types'

const FALLBACK_TARGET_DATE = new Date('2026-05-10T00:00:00')

const parseDate = (value?: string) => {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getCountdown(targetMs: number, nowMs: number) {
  const diff = targetMs - nowMs
  if (diff <= 0) return { hari: 0, jam: 0, menit: 0 }
  return {
    hari: Math.floor(diff / (1000 * 60 * 60 * 24)),
    jam: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    menit: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
  }
}

function CountBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center w-[88px] h-[88px] bg-[#2563EB] border border-neutral-200 rounded-[8px] overflow-hidden">
      <span className="text-2xl font-bold leading-[36px] text-[#FFD76E]">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-base font-normal leading-[24px] text-white">
        {label}
      </span>
    </div>
  )
}

const CountdownSNBT = ({ utbk }: { utbk?: ProgressOverviewUTBK }) => {
  const targetDate = useMemo(
    () => parseDate(utbk?.end_at) || FALLBACK_TARGET_DATE,
    [utbk?.end_at]
  )
  const targetMs = targetDate.getTime()

  const [countdown, setCountdown] = useState(() => {
    return getCountdown(targetMs, Date.now())
  })

  useEffect(() => {
    setCountdown(getCountdown(targetMs, Date.now()))

    const id = setInterval(() => {
      setCountdown(getCountdown(targetMs, Date.now()))
    }, 60000)

    return () => clearInterval(id)
  }, [targetMs])

  return (
    <div className='relative overflow-hidden bg-white w-full rounded-xl border border-neutral-100 px-[22px] py-[30px] flex flex-col shadow-[0_2px_4px_0_rgba(0,0,0,0.08),0_3px_10px_0_rgba(0,0,0,0.10)] gap-6'>
      <div className="flex flex-col items-center self-stretch z-10">
        <h3 className="text-2xl font-bold leading-[36px] text-neutral-1000 text-center">
          Menuju SNBT 2026
        </h3>
        <p className="text-base font-normal leading-[24px] text-neutral-1000 text-center">
          Waktu terus berjalan, persiapkan dirimu dari sekarang!
        </p>
      </div>

      <div className="flex items-center justify-center gap-[20px] w-full">
        <CountBox value={countdown.hari} label="Hari" />
        <CountBox value={countdown.jam} label="Jam" />
        <CountBox value={countdown.menit} label="Menit" />
      </div>


      <Image src="/icons/stopwatch.svg" alt="stopwatch" width={100} height={110} className='hidden xl:block absolute -bottom-4 right-0' />

    </div>
  )
}

export default CountdownSNBT