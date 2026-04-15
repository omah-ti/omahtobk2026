"use client"

import Container from '@/components/container'
import { isMobile } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MoveRight } from 'lucide-react'
import React from 'react'

type CompsciItem = {
  imageUrl: string
  title: string
  category: string
  desc: string
}

const compsciItems: CompsciItem[] = [
  {
    imageUrl: '/assets/divisions/backend.webp',
    title: 'Backend Engineering',
    category: 'TEKNIS',
    desc: 'Bangun logika server dan arsitektur basis data yang kokoh dengan API yang efisien, sistem data yang aman, serta infrastruktur stabil agar aplikasi berjalan tanpa hambatan.',
  },
  {
    imageUrl: '/assets/divisions/frontend.webp',
    title: 'Frontend Engineering',
    category: 'INOVASI',
    desc: 'Kembangkan antarmuka digital interaktif dan responsif dengan HTML, CSS, dan JavaScript, serta optimalkan performa untuk pengalaman pengguna yang maksimal di berbagai perangkat.',
  },
  {
    imageUrl: '/assets/divisions/uiux.webp',
    title: 'UI/UX Design',
    category: 'KREATIF',
    desc: 'Rancang pengalaman pengguna yang intuitif dan antarmuka visual yang estetis melalui riset, wireframe interaktif, dan prototipe fungsional di berbagai ukuran layar.',
  },
  {
    imageUrl: '/assets/divisions/cysec.webp',
    title: 'Cyber Security',
    category: 'TEKNIS',
    desc: 'Lindungi sistem dan data dari ancaman digital dengan analisis kerentanan, pemantauan aktivitas mencurigakan, serta perancangan protokol keamanan berlapis.',
  },
  {
    imageUrl: '/assets/divisions/dsai.webp',
    title: 'Data Science & AI',
    category: 'ANALITIK',
    desc: 'Bangun dan latih model kecerdasan buatan untuk mengotomatisasi sistem kompleks melalui machine learning, NLP, dan optimasi algoritma berbasis data.',
  },
  {
    imageUrl: '/assets/divisions/mobapps.webp',
    title: 'Mobile Development',
    category: 'INOVASI',
    desc: 'Kembangkan aplikasi mobile yang efisien dan konsisten di iOS maupun Android dengan integrasi fitur perangkat serta performa optimal di berbagai ukuran layar.',
  },
  {
    imageUrl: '/assets/divisions/gamedev.webp',
    title: 'Game Development',
    category: 'KREATIF',
    desc: 'Ciptakan pengalaman interaktif yang imersif melalui pengembangan logika permainan, optimalisasi gameplay, dan performa tinggi dengan game engine modern.',
  },
]

const wrapIndex = (index: number, length: number): number => {
  if (index < 0) return length - 1
  if (index >= length) return 0
  return index
}

const CompsciDivisions = () => {
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [isPaused, setIsPaused] = React.useState(false)
  const touchStartX = React.useRef<number | null>(null)

  const goNext = React.useCallback(() => {
    setActiveIndex((prev) => wrapIndex(prev + 1, compsciItems.length))
  }, [])

  const goPrev = React.useCallback(() => {
    setActiveIndex((prev) => wrapIndex(prev - 1, compsciItems.length))
  }, [])

  React.useEffect(() => {
    if (isPaused) return

    const intervalId = window.setInterval(() => {
      setActiveIndex((prev) => wrapIndex(prev + 1, compsciItems.length))
    }, 6000)

    return () => window.clearInterval(intervalId)
  }, [isPaused])

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') goPrev()
      if (event.key === 'ArrowRight') goNext()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [goNext, goPrev])

  const prevIndex = wrapIndex(activeIndex - 1, compsciItems.length)
  const nextIndex = wrapIndex(activeIndex + 1, compsciItems.length)

  const activeItem = compsciItems[activeIndex]
  const prevItem = compsciItems[prevIndex]
  const nextItem = compsciItems[nextIndex]

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null
  }

  const onTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const startX = touchStartX.current
    const endX = event.changedTouches[0]?.clientX

    if (startX === null || typeof endX !== 'number') return

    const deltaX = endX - startX
    const minSwipeDistance = 50

    if (deltaX > minSwipeDistance) goPrev()
    if (deltaX < -minSwipeDistance) goNext()

    touchStartX.current = null
  }

  return (
    <Container>
      <section className='relative isolate w-full py-8 md:py-12'>

          <>
            <div
              aria-hidden='true'
              className='pointer-events-none absolute top-1/2 left-1/3 md:left-0 md:top-0 z-0  -translate-x-1/3 -translate-y-1/3 rounded-full bg-primary-400 blur-[160px] h-[250px] w-[250px]'
            />
            <div
              aria-hidden='true'
              className='pointer-events-none hidden md:absolute right-0 bottom-0 z-0 h-[100px] w-[100px] translate-x-1/3 -translate-y-1/3 rounded-full bg-primary-400 blur-[200px] min-[1000px]:h-[250px] min-[1000px]:w-[250px]'
            />
          </>
        
        <div className='relative z-10'>
          <div className='mb-8 text-center md:mb-10'>
            <h2 className='text-center text-[20px] md:text-[34px] font-bold leading-tight text-neutral-1100'>
              Pilih Jalur Masa Depanmu
            </h2>
            <p className='mx-auto mt-1 md:mt-2 max-w-2xl text-[15px] text-neutral-900 xl:text-[17px]'>
              Kuasai Spesialisasi Karier Global Strategis
            </p>
          </div>

          <div
            className='relative left-1/2 w-screen -translate-x-1/2 overflow-x-clip min-[1000px]:hidden'
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div className='relative mx-auto flex w-full max-w-[430px] items-center justify-center overflow-visible px-4 py-5'>
              <div className='pointer-events-none absolute left-0 top-1/2 h-[170px] shadow-[0_10px_26px_rgba(15,23,42,0.16)] w-5 -translate-y-1/2 rounded-r-xl bg-gradient-to-r from-white to-transparent' />
              <div className='pointer-events-none absolute right-0 top-1/2 h-[170px] shadow-[0_10px_26px_rgba(15,23,42,0.16)] w-5 -translate-y-1/2 rounded-l-xl bg-gradient-to-l from-white to-transparent' />

              <article className='relative z-10 h-[230px] w-[90%] rounded-2xl bg-[#F5F7FB] shadow-[0_4px_4px_0_rgba(0,0,0,0.25)] transition-all duration-500'>
                <div className='flex h-full items-center gap-3 p-4'>
                  <div className='h-[96px] w-[96px] flex-shrink-0 overflow-hidden rounded-xl bg-neutral-100'>
                    <img
                      src={activeItem.imageUrl}
                      alt={activeItem.title}
                      className='h-full w-full object-contain'
                    />
                  </div>
                  <div className='flex min-w-0 flex-1 flex-col justify-center gap-1.5'>
                    <p className='text-right text-[8px] font-bold uppercase tracking-[0.12em] text-neutral-1100'>
                      {activeItem.category}
                    </p>
                    <h3 className='line-clamp-2 text-[14px] font-bold leading-tight text-neutral-1100'>
                      {activeItem.title}
                    </h3>
                    <p className='line-clamp-5 text-[12px] leading-relaxed text-neutral-1000'>
                      {activeItem.desc}
                    </p>
                  </div>
                </div>
              </article>

              <button
                type='button'
                aria-label='Slide sebelumnya'
                onClick={goPrev}
                className='absolute left-2 z-20 flex h-9 w-9 items-center justify-center text-neutral-1000 transition hover:scale-105'
              >
                <ChevronLeft className='h-7 w-7' />
              </button>
              <button
                type='button'
                aria-label='Slide berikutnya'
                onClick={goNext}
                className='absolute right-2 z-20 flex h-9 w-9 items-center justify-center text-neutral-1000 transition hover:scale-105'
              >
                <ChevronRight className='h-7 w-7' />
              </button>
            </div>
          </div>

          <div
            className='hidden w-full min-[1000px]:flex min-[1000px]:items-stretch min-[1000px]:justify-center min-[1000px]:gap-4 xl:gap-6'
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className='flex w-[20%] min-w-[180px] max-w-[250px] flex-shrink-0 flex-col justify-between gap-3'>
              <div className='flex justify-end'>
                <button
                  type='button'
                  aria-label='Slide sebelumnya'
                  onClick={goPrev}
                  className='flex h-20 w-20 items-center justify-center rounded-full bg-[#F5F7FB] text-2xl text-neutral-900 shadow-[0_10px_26px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.2)]'
                >
                  <MoveRight className='h-7 w-7 rotate-180 text-[#008CFF]' />
                </button>
              </div>

              <article className='rounded-2xl bg-[#F5F7FB] p-8 shadow-[0_12px_30px_rgba(15,23,42,0.15)] transition duration-500 hover:-translate-y-1'>
                <div className='flex min-h-[180px] flex-col items-center justify-center text-center'>
                  <div className='h-[100px] w-[100px] overflow-hidden rounded-xl bg-neutral-100'>
                    <img
                      src={prevItem.imageUrl}
                      alt={prevItem.title}
                      className='h-full w-full object-contain'
                    />
                  </div>
                  <h4 className='mt-4 line-clamp-2 text-[20px] font-semibold leading-tight text-neutral-1000'>
                    {prevItem.title}
                  </h4>
                </div>
              </article>
            </div>

            <article className='w-full min-w-0 max-w-[820px] flex-1 rounded-[28px] bg-[#F5F7FB] shadow-[0_20px_50px_rgba(15,23,42,0.2)] xl:max-w-[920px]'>
              <div className='flex items-center gap-6 p-8 xl:gap-10 xl:p-[52px]'>
                <div className='h-[180px] w-[180px] flex-shrink-0 overflow-hidden rounded-2xl bg-neutral-100 xl:h-[230px] xl:w-[230px]'>
                  <img
                    src={activeItem.imageUrl}
                    alt={activeItem.title}
                    className='h-full w-full object-contain'
                  />
                </div>
                <div className='flex min-w-0 flex-1 flex-col justify-center gap-3 xl:gap-4'>
                  <p className='text-right text-[15px] font-bold uppercase tracking-[0.16em] text-neutral-1100'>
                    Kategori: {activeItem.category}
                  </p>
                  <h3 className='text-[30px] font-bold leading-tight text-neutral-1100 xl:text-[36px]'>
                    {activeItem.title}
                  </h3>
                  <p className='max-w-3xl text-[16px] leading-relaxed text-neutral-1000'>{activeItem.desc}</p>
                </div>
              </div>
            </article>

            <div className='flex w-[20%] min-w-[180px] max-w-[250px] flex-shrink-0 flex-col justify-between gap-3'>
              <article className='rounded-2xl bg-[#F5F7FB] p-8 shadow-[0_12px_30px_rgba(15,23,42,0.15)] transition duration-500 hover:-translate-y-1'>
                <div className='flex min-h-[180px] flex-col items-center justify-center text-center'>
                  <div className='h-[100px] w-[100px] overflow-hidden rounded-xl bg-neutral-100'>
                    <img
                      src={nextItem.imageUrl}
                      alt={nextItem.title}
                      className='h-full w-full object-contain'
                    />
                  </div>
                  <h4 className='mt-4 line-clamp-2 text-[20px] font-semibold leading-tight text-neutral-1000'>
                    {nextItem.title}
                  </h4>
                </div>
              </article>

              <div className='flex justify-start'>
                <button
                  type='button'
                  aria-label='Slide berikutnya'
                  onClick={goNext}
                  className='flex h-20 w-20 items-center justify-center rounded-full bg-[#F5F7FB] text-2xl text-neutral-900 shadow-[0_10px_26px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.2)]'
                >
                  <MoveRight className='h-7 w-7 text-[#008CFF]' />
                </button>
              </div>
            </div>
          </div>

          <div className='mt-6 flex items-center justify-center gap-2'>
            {compsciItems.map((item, index) => (
              <button
                key={item.title}
                type='button'
                aria-label={`Buka slide ${index + 1}`}
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 rounded-full transition-all duration-300 ${index === activeIndex ? 'w-8 bg-primary-200' : 'w-2.5 bg-neutral-300 hover:bg-neutral-400'
                  }`}
              />
            ))}
          </div>
        </div>
      </section>
    </Container>
  )
}

export default CompsciDivisions