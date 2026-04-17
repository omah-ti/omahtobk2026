'use client'

import { useEffect, useState } from 'react'
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
    <div className="flex flex-col items-center justify-center w-[88px] h-[88px] bg-[#2563EB] border border-neutral-200 rounded-[8px]">
      <span className="text-2xl font-bold leading-[36px] text-[#FFD76E]">
        {String(value).padStart(3, '0')}
      </span>
      <span className="text-base font-normal leading-[24px] text-white">
        {label}
      </span>
    </div>
  )
}

const CountdownSNBT = ({ utbk }: { utbk?: ProgressOverviewUTBK }) => {
  const targetDate = parseDate(utbk?.end_at) || FALLBACK_TARGET_DATE

  const [countdown, setCountdown] = useState(() => {
    return getCountdown(targetDate.getTime(), Date.now())
  })

  useEffect(() => {
    setCountdown(getCountdown(targetDate.getTime(), Date.now()))

    const id = setInterval(() => {
      setCountdown(getCountdown(targetDate.getTime(), Date.now()))
    }, 60000)

    return () => clearInterval(id)
  }, [targetDate])

  return (
    <div className="relative flex flex-col items-center gap-[24px] p-5 bg-neutral-100 border border-neutral-200 rounded-[8px] shadow-[0_2px_4px_0_rgba(0,0,0,0.05)] overflow-hidden">

      <div className="flex flex-col items-center gap-[4px] self-stretch">
        <h3 className="text-2xl font-bold leading-[36px] text-neutral-900 text-center">
          Menuju SNBT 2026
        </h3>
        <p className="text-base font-normal leading-[24px] text-neutral-900 text-center">
          Waktu terus berjalan, persiapkan dirimu dari sekarang!
        </p>
      </div>

      <div className="flex items-center justify-center gap-[20px] w-full">
        <CountBox value={countdown.hari} label="Hari" />
        <CountBox value={countdown.jam} label="Jam" />
        <CountBox value={countdown.menit} label="Menit" />
      </div>

      <div className="hidden md:block absolute bottom-0 right-0">
        <Image src="/icons/stopwatch.svg" alt="stopwatch" width={100} height={110} />
      </div>

    </div>
  )
}

export default CountdownSNBT