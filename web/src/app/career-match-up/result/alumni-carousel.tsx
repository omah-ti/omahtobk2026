'use client'

import Image from 'next/image'
import React from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type AlumniItem = {
  name: string
  role: string
  image?: string
  desc: string
}

type AlumniCarouselProps = {
  items: AlumniItem[]
}

const CLONE_COUNT = 3
const CARD_WIDTH = 330
const CARD_GAP = 16
const STEP_SIZE = CARD_WIDTH + CARD_GAP

export default function AlumniCarousel({ items }: AlumniCarouselProps) {
  const safeItems = items ?? []
  const totalCardsWidth =
    safeItems.length * CARD_WIDTH + Math.max(safeItems.length - 1, 0) * CARD_GAP

  const loopItems = React.useMemo(() => {
    if (safeItems.length === 0) return []

    const head = safeItems.slice(0, CLONE_COUNT)
    const tail = safeItems.slice(-CLONE_COUNT)
    return [...tail, ...safeItems, ...head]
  }, [safeItems])

  const [currentIndex, setCurrentIndex] = React.useState(CLONE_COUNT)
  const [isPaused, setIsPaused] = React.useState(false)
  const [isAnimating, setIsAnimating] = React.useState(true)
  const [containerWidth, setContainerWidth] = React.useState(0)
  const [mobileViewportWidth, setMobileViewportWidth] = React.useState(CARD_WIDTH)
  const touchStartX = React.useRef<number | null>(null)
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const mobileViewportRef = React.useRef<HTMLDivElement | null>(null)

  const goNext = React.useCallback(() => {
    if (safeItems.length <= 1) return
    setIsAnimating(true)
    setCurrentIndex((prev) => prev + 1)
  }, [safeItems.length])

  const goPrev = React.useCallback(() => {
    if (safeItems.length <= 1) return
    setIsAnimating(true)
    setCurrentIndex((prev) => prev - 1)
  }, [safeItems.length])

  const mobileContainerWidth = Math.min(containerWidth || 430, 430)
  const mediumContainerWidth = Math.min(containerWidth || 676, 676)
  const largeContainerWidth = Math.min(containerWidth || 1022, 1022)

  const shouldUseMobileCarousel = totalCardsWidth > mobileContainerWidth
  const shouldUseMediumCarousel = totalCardsWidth > mediumContainerWidth
  const shouldUseLargeCarousel = totalCardsWidth > largeContainerWidth

  const shouldAutoSlide =
    shouldUseMobileCarousel || shouldUseMediumCarousel || shouldUseLargeCarousel

  React.useEffect(() => {
    if (isPaused || !shouldAutoSlide) return

    const intervalId = window.setInterval(goNext, 5000)
    return () => window.clearInterval(intervalId)
  }, [goNext, isPaused, shouldAutoSlide])

  const handleTransitionEnd = () => {
    if (safeItems.length === 0) return

    if (currentIndex >= safeItems.length + CLONE_COUNT) {
      setIsAnimating(false)
      setCurrentIndex(CLONE_COUNT)
      return
    }

    if (currentIndex < CLONE_COUNT) {
      setIsAnimating(false)
      setCurrentIndex(safeItems.length + CLONE_COUNT - 1)
      return
    }
  }

  React.useEffect(() => {
    if (!isAnimating) {
      requestAnimationFrame(() => setIsAnimating(true))
    }
  }, [isAnimating])

  React.useEffect(() => {
    const updateWidth = () => {
      const width = mobileViewportRef.current?.getBoundingClientRect().width
      if (typeof width === 'number' && width > 0) {
        setMobileViewportWidth(width)
      }
    }

    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  React.useEffect(() => {
    const updateContainerWidth = () => {
      const width = rootRef.current?.getBoundingClientRect().width
      if (typeof width === 'number' && width > 0) {
        setContainerWidth(width)
      }
    }

    updateContainerWidth()
    const observer = new ResizeObserver(updateContainerWidth)
    if (rootRef.current) {
      observer.observe(rootRef.current)
    }

    window.addEventListener('resize', updateContainerWidth)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateContainerWidth)
    }
  }, [])

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null
  }

  const onTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const startX = touchStartX.current
    const endX = event.changedTouches[0]?.clientX

    if (startX === null || typeof endX !== 'number') return

    const deltaX = endX - startX
    if (deltaX > 50) goPrev()
    if (deltaX < -50) goNext()
    touchStartX.current = null
  }

  const activeIndex =
    safeItems.length === 0
      ? 0
      : ((currentIndex - CLONE_COUNT) % safeItems.length + safeItems.length) %
      safeItems.length

  const mobileCenterOffset = Math.max((mobileViewportWidth - CARD_WIDTH) / 2, 0)

  const renderCard = (item: AlumniItem, key: string) => (
    <div key={key} className='w-[330px] shrink-0'>
      <Accordion type='single' collapsible className='w-[330px]'>
        <AccordionItem
          value={`${item.name.toLowerCase().replace(/\s+/g, '-')}-${key}`}
          className='overflow-hidden rounded-[24px] border border-slate-300 bg-white shadow-[0_4px_4px_0_rgba(0,0,0,0.25)]'
        >
          <Image
            src={item.image || '/assets/alumni/placeholder.webp'}
            alt={item.name}
            width={960}
            height={540}
            className='h-[135px] w-full object-cover'
          />
          <div>
            <AccordionTrigger className='w-full py-4 px-6 text-xs cursor-pointer font-normal items-center text-black hover:no-underline'>
              <div className='flex flex-col text-left'>
                <h4 className='text-base font-bold text-neutral-1000'>{item.name}</h4>
                <p className='text-xs text-neutral-text'>{item.role}</p>
              </div>
            </AccordionTrigger>
            <AccordionContent className='px-6 pb-5 text-xs text-black transition-all duration-300'>
              {item.desc}
            </AccordionContent>
          </div>
        </AccordionItem>
      </Accordion>
    </div>
  )

  const renderMobileCard = (item: AlumniItem, key: string) => (
    <div key={key} className='w-[330px] shrink-0'>
      <Accordion type='single' collapsible className='w-[330px]'>
        <AccordionItem
          value={`${item.name.toLowerCase().replace(/\s+/g, '-')}-${key}`}
          className='overflow-hidden rounded-[24px] border border-slate-300 bg-white shadow-[0_4px_4px_0_rgba(0,0,0,0.25)]'
        >
          <Image
            src={item.image || '/assets/alumni/placeholder.webp'}
            alt={item.name}
            width={960}
            height={540}
            className='h-[135px] w-full object-cover'
          />
          <div>
            <AccordionTrigger className='w-full py-4 px-6 text-xs cursor-pointer font-normal items-center text-black hover:no-underline'>
              <div className='flex flex-col text-left'>
                <h4 className='text-base font-bold text-neutral-1000'>{item.name}</h4>
                <p className='text-xs text-neutral-text'>{item.role}</p>
              </div>
            </AccordionTrigger>
            <AccordionContent className='px-6 pb-5 text-xs text-black transition-all duration-300'>
              {item.desc}
            </AccordionContent>
          </div>
        </AccordionItem>
      </Accordion>
    </div>
  )

  if (safeItems.length === 0) {
    return null
  }

  return (
    <div ref={rootRef} className='w-full'>
      <div className='md:hidden'>
        {shouldUseMobileCarousel ? (
          <div
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div
              ref={mobileViewportRef}
              className='relative mx-auto w-full pl-0 pb-5 max-w-[430px] overflow-hidden'
            >
              <div
                onTransitionEnd={handleTransitionEnd}
                className={`flex gap-4 ${isAnimating ? 'transition-transform duration-500 ease-out' : ''}`}
                style={{
                  transform: `translateX(${mobileCenterOffset - currentIndex * STEP_SIZE}px)`,
                }}
              >
                {loopItems.map((item, index) =>
                  renderMobileCard(item, `mobile-${index}`)
                )}
              </div>

              <button
                type='button'
                aria-label='Slide alumni sebelumnya'
                onClick={goPrev}
                className='absolute left-2 top-1/2 z-10 -translate-y-1/2 p-1 text-neutral-1000 transition'
              >
                <ChevronLeft className='h-8 w-8' />
              </button>
              <button
                type='button'
                aria-label='Slide alumni berikutnya'
                onClick={goNext}
                className='absolute right-2 top-1/2 z-10 -translate-y-1/2 p-1 text-neutral-1000 transition'
              >
                <ChevronRight className='h-8 w-8' />
              </button>
            </div>
          </div>
        ) : (
          <div className='flex justify-center'>{renderMobileCard(safeItems[0], 'mobile-static-0')}</div>
        )}
      </div>

      {shouldUseMediumCarousel ? (
        <div
          className='hidden md:block lg:hidden'
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className='relative mx-auto w-full max-w-[676px] overflow-hidden'>
            <div
              onTransitionEnd={handleTransitionEnd}
              className={`flex gap-4 ${isAnimating ? 'transition-transform duration-500 ease-out' : ''}`}
              style={{ transform: `translateX(-${currentIndex * STEP_SIZE}px)` }}
            >
              {loopItems.map((item, index) => renderCard(item, `medium-${index}`))}
            </div>

            <button
              type='button'
              aria-label='Slide alumni sebelumnya'
              onClick={goPrev}
              className='absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-700 shadow transition hover:bg-white'
            >
              <ChevronLeft className='h-5 w-5' />
            </button>
            <button
              type='button'
              aria-label='Slide alumni berikutnya'
              onClick={goNext}
              className='absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-700 shadow transition hover:bg-white'
            >
              <ChevronRight className='h-5 w-5' />
            </button>
          </div>

          <div className='mt-4 flex items-center justify-center gap-2'>
            {safeItems.map((item, index) => (
              <button
                key={`medium-dot-${index}-${item.name}`}
                type='button'
                aria-label={`Buka alumni ${index + 1}`}
                onClick={() => {
                  setIsAnimating(true)
                  setCurrentIndex(CLONE_COUNT + index)
                }}
                className={`h-2.5 rounded-full transition-all duration-300 ${index === activeIndex
                  ? 'w-7 bg-primary-200'
                  : 'w-2.5 bg-neutral-300 hover:bg-neutral-400'
                  }`}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className='hidden md:flex lg:hidden md:justify-center md:gap-4'>
          {safeItems.map((item, index) => renderCard(item, `medium-static-${index}`))}
        </div>
      )}

      {shouldUseLargeCarousel ? (
        <div
          className='hidden lg:block'
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className='relative mx-auto w-full max-w-[1022px] pb-3 overflow-hidden'>
            <div
              onTransitionEnd={handleTransitionEnd}
              className={`flex gap-4 ${isAnimating ? 'transition-transform duration-500 ease-out' : ''}`}
              style={{ transform: `translateX(-${currentIndex * STEP_SIZE}px)` }}
            >
              {loopItems.map((item, index) => renderCard(item, `desktop-${index}`))}
            </div>

            <button
              type='button'
              aria-label='Slide alumni sebelumnya'
              onClick={goPrev}
              className='absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-700 shadow transition hover:bg-white'
            >
              <ChevronLeft className='h-5 w-5' />
            </button>
            <button
              type='button'
              aria-label='Slide alumni berikutnya'
              onClick={goNext}
              className='absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-700 shadow transition hover:bg-white'
            >
              <ChevronRight className='h-5 w-5' />
            </button>
          </div>

          <div className='mt-4 flex items-center justify-center gap-2'>
            {safeItems.map((item, index) => (
              <button
                key={`desktop-dot-${index}-${item.name}`}
                type='button'
                aria-label={`Buka alumni ${index + 1}`}
                onClick={() => {
                  setIsAnimating(true)
                  setCurrentIndex(CLONE_COUNT + index)
                }}
                className={`h-2.5 rounded-full transition-all duration-300 ${index === activeIndex
                  ? 'w-7 bg-primary-200'
                  : 'w-2.5 bg-neutral-300 hover:bg-neutral-400'
                  }`}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className='hidden lg:flex lg:justify-center lg:gap-4'>
          {safeItems.map((item, index) => renderCard(item, `large-static-${index}`))}
        </div>
      )}
    </div>
  )
}
