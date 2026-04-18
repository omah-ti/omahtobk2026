import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Book, Clock, Layers, Timer, PlayCircle } from 'lucide-react'
import Link from 'next/link'
import Image from "next/image";

type TryoutBannerProps = {
  status: 'none' | 'ongoing' | 'finished'
  deadline?: string
}

const STATS = [
  { icon: Clock, label: '195 Menit' },
  { icon: Book, label: '170 Soal' },
  { icon: Layers, label: '7 Subtest' },
]

const TryoutBanner = ({ status, deadline = '19 April 2026' }: TryoutBannerProps) => {
  return (
    <section className='relative overflow-hidden rounded-lg border border-neutral-200 bg-gradient-to-br from-[#1a3fa8] via-[#2152c8] to-[#1a4fd4] text-white shadow-[0_2px_4px_0_rgba(0,0,0,0.08)]'>
      <div className='flex items-stretch'>
        <div className='flex w-[521px] min-h-[238px] flex-col justify-between p-[30px]'>
          <div className='flex flex-wrap gap-2'>
            {STATS.map(({ icon: Icon, label }) => (
              <span key={label} className='flex items-center gap-2 rounded-[13px] border border-primary-100/30 bg-primary-100/30 px-4 py-2.5 text-xs font-medium text-white'>
                <Icon className='h-[14px] w-[14px]' />
                {label}
              </span>
            ))}
            <span className='flex items-center gap-2 rounded-[13px] border border-red-200/40 bg-red-400/20 px-4 py-2.5 text-xs font-medium text-red-100'>
              <Timer className='h-[14px] w-[14px]' />
              Berakhir {deadline}
            </span>
          </div>

          <div className='flex flex-col gap-2 max-w-lg'>
            <h2 className='text-2xl font-bold leading-tight text-white'>
              Try Out UTBK Nasional
            </h2>
            <p className='text-sm font-normal leading-5 text-white/80'>
              Evaluasi kemampuanmu dengan simulasi SNBT berstandar nasional terbaru.
              Fokus pada penalaran umum, literasi bahasa, dan kuantitatif.
            </p>
          </div>

        </div>

        <div className="relative flex-1">
          <Image src="/image.webp" alt="Student" width={475} height={317} className="absolute bottom-0 right-0 h-full w-auto object-contain object-bottom"/>
        </div>
      </div>
    </section>
  )
}

export default TryoutBanner