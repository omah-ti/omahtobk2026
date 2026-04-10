/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'
import { useTryoutData } from '@/app/tryout/(test)/tryout-context'
import SmallStyledCard from '@/components/tryout/small-styled-card'
import { Button } from '@/components/ui/button'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/tryout-carousel'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

// interface AnswerPayload {
//   kode_soal: string
//   jawaban: string | null
// }

const NumberCarousel = ({ totalQuestions }: { totalQuestions: number }) => {
  const pathname = usePathname()
  const { value: soal } = useTryoutData()
  let currentNumber = Number(pathname.slice(pathname.lastIndexOf('/') + 1))
  const [savedAnswers, setSavedAnswers] = useState<Record<string, any>>({})

  // Function to get answers from localStorage
  const getAnswersFromLocalStorage = useCallback(() => {
    try {
      const answersJson = localStorage.getItem('tryout_answers_user')
      if (answersJson) {
        const parsedAnswers = JSON.parse(answersJson)
        // Use functional update to avoid issues with stale state
        setSavedAnswers((current) => {
          // Only update if there's an actual change
          if (JSON.stringify(current) !== JSON.stringify(parsedAnswers)) {
            return parsedAnswers
          }
          return current
        })
      }
    } catch (e) {
      console.error('Error parsing answers from localStorage:', e)
    }
  }, [])

  // Use useEffect to handle localStorage and events
  useEffect(() => {
    // Initial call to get answers
    getAnswersFromLocalStorage()

    // Set up interval to run every 5 seconds
    const intervalId = setInterval(getAnswersFromLocalStorage, 5000)

    // Listen for custom event from AnswerCard when an answer is updated
    const handleAnswerUpdate = () => {
      // Use requestAnimationFrame to ensure we're not in the middle of a render cycle
      requestAnimationFrame(() => {
        getAnswersFromLocalStorage()
      })
    }

    window.addEventListener('tryout_answer_updated', handleAnswerUpdate)

    // Clean up function
    return () => {
      clearInterval(intervalId)
      window.removeEventListener('tryout_answer_updated', handleAnswerUpdate)
    }
  }, [getAnswersFromLocalStorage])

  // Ensure the currentNumber stays within the valid range
  if (isNaN(currentNumber) || currentNumber < 1) {
    currentNumber = 1
  } else if (currentNumber > totalQuestions) {
    currentNumber = totalQuestions
  }

  return (
    <>
      <SmallStyledCard className='w-full py-4'>
        <Carousel className='mx-auto w-full'>
          <section className='flex items-center justify-between gap-2'>
            <CarouselPrevious className='relative shrink-0' />
            <CarouselContent className='-ml-2 w-full'>
              {Array.from({ length: totalQuestions }).map((_, index) => {
                const questionNumber = index + 1
                const isCurrentQuestion = currentNumber === questionNumber

                // Check if the current question has been answered
                const questionCode = soal?.[index]?.kode_soal
                const hasAnswer = questionCode && savedAnswers[questionCode]

                return (
                  <CarouselItem
                    key={index}
                    className='basis-[33%] pl-2 min-[400px]:basis-[25%] sm:basis-[11%] md:basis-[9%] lg:basis-[6%] xl:basis-[5%]'
                  >
                    <Link
                      href={`/tryout/soal/${questionNumber}`}
                      replace={true}
                      scroll={false}
                    >
                      <Button
                        variant={isCurrentQuestion ? 'secondary' : 'card'}
                        className={`cursor-pointer select-none transition-all ${hasAnswer ? 'border-secondary border-2' : ''}`}
                      >
                        <span className='font-semibold'>{questionNumber}</span>
                      </Button>
                    </Link>
                  </CarouselItem>
                )
              })}
            </CarouselContent>
            <CarouselNext className='relative shrink-0' />
          </section>
        </Carousel>
      </SmallStyledCard>
    </>
  )
}

export default NumberCarousel
