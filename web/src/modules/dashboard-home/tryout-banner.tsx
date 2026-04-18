import { Button } from '@/components/ui/button'
import { Book, Clock, Layers, AlertCircle, PlayCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

type TryoutBannerProps = {
  status: 'none' | 'ongoing' | 'finished'
  deadline?: string
  nextRoute?: string
}

const STATS = [
  { icon: Clock, label: '195 Menit' },
  { icon: Book, label: '170 Soal' },
  { icon: Layers, label: '7 Subtest' },
]

const TryoutBanner = ({
  status,
  deadline = '19 April 2026',
  nextRoute = '/tryout/penalaran-umum',
}: TryoutBannerProps) => {
  return (
    <section className='relative overflow-hidden rounded-lg border border-neutral-200 bg-gradient-to-br from-[#1a3fa8] via-[#2152c8] to-[#1a4fd4] text-white shadow-[0_2px_4px_0_rgba(0,0,0,0.08)]'>
      <div className='flex flex-col gap-10 md:gap-13 z-10 p-[14px] md:p-[30px]'>
        <div className='flex w-full gap-3 flex-col '>
          <div className='flex flex-wrap gap-2'>
            {STATS.map(({ icon: Icon, label }) => (
              <span key={label} className='flex items-center gap-2 rounded-xl md:rounded-[12px] border border-primary-100/30 bg-primary-100/30 px-2 md:px-4 py-1 md:py-2.5 text-[10px] md:text-xs font-medium text-white'>
                <Icon className='h-[14px] w-[14px]' />
                {label}
              </span>
            ))}
            <span className='md:flex hidden items-center gap-2 rounded-[13px] border border-red-200 bg-red-100 px-4 py-2.5 text-xs font-medium text-neutral-1000'>
              <AlertCircle className='h-[14px] w-[14px]' />
              Berakhir {deadline}
            </span>
          </div>


          <div className='flex flex-col gap-2 max-w-lg'>
            <h2 className='text-2xl font-bold leading-tight text-white'>
              Try Out UTBK Nasional
            </h2>
            <p className='text-[10px] md:text-base font-normal text-white/80'>
              Evaluasi kemampuanmu dengan simulasi SNBT berstandar nasional terbaru.
              Fokus pada penalaran umum, literasi bahasa, dan kuantitatif.
            </p>
          </div>

          <span className='flex md:hidden w-fit items-center gap-2 rounded-xl border border-red-200 bg-red-100 px-2 py-1 text-[10px] font-medium text-neutral-1000'>
            <AlertCircle className='h-[14px] w-[14px]' />
            Berakhir {deadline}
          </span>
        </div>

        {status !== 'finished' && (
          <Link href={nextRoute}>
            <Button variant='white' className='px-6'>
              <PlayCircle /> Mulai Sekarang
            </Button>
          </Link>
        )}

      </div>

      <Image
        src='/image.webp'
        alt='Student'
        width={475}
        height={317}
        className='absolute bottom-0 -right-5 md:right-0 md:h-full w-auto object-contain object-bottom'
      />
    </section>
  )
}

export default TryoutBanner