'use client'

import Container from '@/components/container'
import {
  ArrowLeft,
  Book,
  CircleAlert,
  CirclePlay,
  CircleX,
  Clock3,
  FileText,
  Layers2,
  List,
  TriangleAlert,
  Wifi,
} from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { type ReactNode, useMemo, useState } from 'react'

type SubtestItem = {
  slug: string
  title: string
  totalQuestion: number
  targetPath: string
}

const SUBTESTS: SubtestItem[] = [
  {
    slug: 'penalaran-umum',
    title: 'Penalaran Umum',
    totalQuestion: 30,
    targetPath: '/tryout/pu',
  },
  {
    slug: 'pengentahuan-dan-pemahaman-umum',
    title: 'Pengetahuan dan Pemahaman Umum',
    totalQuestion: 20,
    targetPath: '/tryout/ppu',
  },
  {
    slug: 'pemahaman-bacaan-dan-menulis',
    title: 'Pemahaman Bacaan dan Menulis',
    totalQuestion: 20,
    targetPath: '/tryout/pbm',
  },
  {
    slug: 'pengetahuan-kuatitatif',
    title: 'Pengetahuan Kuantitatif',
    totalQuestion: 20,
    targetPath: '/tryout/pk',
  },
  {
    slug: 'literasi-bahasa-indonesia',
    title: 'Literasi dalam Bahasa Indonesia',
    totalQuestion: 30,
    targetPath: '/tryout/lbi',
  },
  {
    slug: 'literasi-bahasa-inggris',
    title: 'Literasi dalam Bahasa Inggris',
    totalQuestion: 20,
    targetPath: '/tryout/lbe',
  },
  {
    slug: 'penalaran-matematika',
    title: 'Penalaran Matematika',
    totalQuestion: 20,
    targetPath: '/tryout/pm',
  },
]

const cardStyle =
  'rounded-lg bg-neutral-200 p-5 shadow-[0_3px_10px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.08)]'

const TryoutSubtestPage = () => {
  const router = useRouter()
  const params = useParams<{ subtest: string }>()
  const [isAgreed, setIsAgreed] = useState(false)
  const currentSlug = params.subtest

  const activeSubtest = useMemo(
    () => SUBTESTS.find((item) => item.slug === currentSlug),
    [currentSlug]
  )

  if (!activeSubtest) {
    return (
      <Container>
        <div className='rounded-lg border border-neutral-300 bg-neutral-50 p-6 text-sm text-neutral-700'>
          Subtest tidak ditemukan.
        </div>
      </Container>
    )
  }

  const startTryout = () => {
    if (!isAgreed) {
      return
    }

    router.push(activeSubtest.targetPath)
  }

  return (
    <Container>
      <section className='flex flex-col gap-[56px] pt-[56px]'>
        <button
          type='button'
          onClick={() => router.back()}
          className='flex w-fit items-center gap-2 rounded-lg bg-[#0D3388] px-[18px] py-[10px] text-[14px] text-white transition-colors hover:bg-primary-700'
        >
          <ArrowLeft size={16} />
          Kembali
        </button>

        <div className='grid grid-cols-1 gap-6 lg:grid-cols-5'>
          <div className='col-span-1 flex flex-col gap-5 lg:col-span-3'>
            <article className={cardStyle}>
              <div className='flex flex-col gap-1'>
                <h4 className='text-[34px] leading-tight font-bold text-neutral-900'>
                  Try Out UTBK Nasional
                </h4>
                <p className='text-[14px] text-neutral-700'>
                  Persiapkan dirimu! Try Out ini dirancang sesuai dengan format
                  soal terbaru dari Panitia Seleksi Nasional Penerimaan
                  Mahasiswa Baru (SNPMB)
                </p>
              </div>

              <div className='mt-5 flex flex-wrap items-center gap-5'>
                <InfoChip icon={<Clock3 size={16} />} text='195 Menit' />
                <InfoChip icon={<FileText size={16} />} text='160 Soal' />
                <InfoChip icon={<Layers2 size={16} />} text='7 Subtest' />
              </div>
            </article>

            <article className={cardStyle}>
              <div className='flex items-center gap-2'>
                <TriangleAlert size={16} className='text-primary-400' />
                <h5 className='text-[16px] font-bold text-neutral-900'>
                  Aturan Pengerjaan
                </h5>
              </div>

              <div className='mt-[14px] flex flex-col gap-4 rounded-lg bg-white p-3'>
                <RuleItem
                  icon={<CircleX size={18} className='text-error-300' />}
                  text='Dilarang bekerja sama, membuka situs lain, atau pakai perangkat lain'
                />
                <RuleItem
                  icon={<CircleX size={18} className='text-error-300' />}
                  text='Dilarang keluar dari website selama try out berlangsung'
                />
                <RuleItem
                  icon={<CircleAlert size={18} className='text-yellow-200' />}
                  text='Jika kamu keluar atau logout saat mengerjakan, subtest akan dianggap selesai'
                />
                <RuleItem
                  icon={<Wifi size={18} className='text-neutral-700' />}
                  text='Pastikan koneksi internetmu stabil'
                />
                <RuleItem
                  icon={<Book size={18} className='text-neutral-700' />}
                  text='Penilaian serta kunci jawaban di akhir pengerjaan'
                />
              </div>
            </article>

            <article className={cardStyle}>
              <div className='flex flex-col gap-[14px]'>
                <label className='flex items-start gap-3 text-[14px] text-neutral-800'>
                  <input
                    type='checkbox'
                    checked={isAgreed}
                    onChange={(event) => setIsAgreed(event.target.checked)}
                    className='mt-0.5 size-4 ronded-[4px] border border-neutral-400 bg-neutral-200 accent-primary-600'
                  />
                  <span>
                    Saya telah membaca, memahami aturan, dan siap mengerjakan
                    dengan jujur.
                  </span>
                </label>

                <button
                  type='button'
                  disabled={!isAgreed}
                  onClick={startTryout}
                  className='flex w-fit items-center gap-2 rounded-lg px-[18px] py-3 text-[16px] font-medium text-white transition-colors disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-600 enabled:bg-primary-600 enabled:hover:bg-primary-700'
                >
                  <CirclePlay size={20} />
                  Mulai Sekarang
                </button>
              </div>
            </article>
          </div>

          <aside className='col-span-1 lg:col-span-2'>
            <article className={cardStyle}>
              <div className='flex items-center gap-2'>
                <List size={16} className='text-primary-400' />
                <h5 className='text-[16px] font-bold text-neutral-900'>
                  Struktur Soal
                </h5>
              </div>

              <div className='mt-[10px] flex flex-col gap-[14px]'>
                {SUBTESTS.map((subtest) => {
                  const isActive = subtest.slug === activeSubtest.slug

                  return (
                    <div
                      key={subtest.slug}
                      className={`flex items-center justify-between rounded-lg border p-3 text-[14px] ${
                        isActive
                          ? 'border-primary-400 bg-primary-200'
                          : 'border-neutral-300 bg-white'
                      }`}
                    >
                      <span className='text-neutral-900'>{subtest.title}</span>
                      <span className='text-neutral-700'>
                        {subtest.totalQuestion} Soal
                      </span>
                    </div>
                  )
                })}
              </div>
            </article>
          </aside>
        </div>
      </section>
    </Container>
  )
}

type InfoChipProps = {
  icon: ReactNode
  text: string
}

const InfoChip = ({ icon, text }: InfoChipProps) => {
  return (
    <div className='flex items-center gap-2 rounded-lg border border-primary-300 bg-primary-200 px-[14px] py-2 text-[12px] text-neutral-900'>
      {icon}
      <span>{text}</span>
    </div>
  )
}

type RuleItemProps = {
  icon: ReactNode
  text: string
}

const RuleItem = ({ icon, text }: RuleItemProps) => {
  return (
    <div className='flex items-start gap-3 text-[14px] text-neutral-800'>
      <span className='mt-0.5'>{icon}</span>
      <p>{text}</p>
    </div>
  )
}

export default TryoutSubtestPage
