// CareerMatchUpTest.tsx
'use client'

import { Button } from '@/components/ui/button'
import { MbQuestion, MbSubmitPayload } from '@/lib/fetch/mb-fetch'
import { isMobile } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useMemo, useState } from 'react'

interface CareerMatchUpTestProps {
  questions: MbQuestion[] | null | undefined
  loading?: boolean
  error?: string
}

type LikertValue = 1 | 2 | 3 | 4 | 5

const QUESTIONS_PER_PAGE = 8

const CHOICE_ITEMS: Array<{
  value: LikertValue
  label: string
  wrapperClassName: string
  activeStyle?: React.CSSProperties
  activeClassName?: string
}> = [
  {
    value: 5,
    label: 'Sangat setuju',
    wrapperClassName:
      'rounded-full md:w-31.75 w-13 md:h-31.75 h-13 p-0.75 bg-green-200 relative',
    activeStyle: {
      background:
        'radial-gradient(60.91% 60.91% at 50% 50%, #FFF 0%, #1FC16B 100%)',
    },
  },
  {
    value: 4,
    label: 'Setuju',
    wrapperClassName:
      'rounded-full md:w-21.75 w-10.5 md:h-21.75 h-10.5 p-0.75 bg-green-200 relative',
    activeStyle: {
      background:
        'radial-gradient(60.91% 60.91% at 50% 50%, #FFF 0%, #1FC16B 100%)',
    },
  },
  {
    value: 3,
    label: 'Netral',
    wrapperClassName:
      'rounded-full md:w-14.25 w-8 md:h-14.25 h-8 p-0.75 bg-gradient-to-r from-green-200 to-red-400 relative',
    activeClassName: 'bg-white/70',
  },
  {
    value: 2,
    label: 'Tidak setuju',
    wrapperClassName:
      'rounded-full md:w-21.75 w-10.5 md:h-21.75 h-10.5 p-0.75 bg-red-400 relative',
    activeStyle: {
      background: 'radial-gradient(50% 50% at 50% 50%, #FFF 0%, #E70518 100%)',
    },
  },
  {
    value: 1,
    label: 'Sangat tidak setuju',
    wrapperClassName:
      'rounded-full md:w-31.75 w-13 md:h-31.75 h-13 p-0.75 bg-red-400 relative',
    activeStyle: {
      background: 'radial-gradient(50% 50% at 50% 50%, #FFF 0%, #E70518 100%)',
    },
  },
]

const getQuestionText = (question: MbQuestion) => {
  return question.statement || question.text_soal || ''
}

const scrollToPageTop = () => {
  if (typeof window === 'undefined') {
    return
  }

  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

const CareerMatchUpTest = ({
  questions,
  loading = false,
  error = '',
}: CareerMatchUpTestProps) => {
  const router = useRouter()
  const safeQuestions = useMemo(
    () => (Array.isArray(questions) ? questions : []),
    [questions]
  )
  const [currentPage, setCurrentPage] = useState(0)
  const [answers, setAnswers] = useState<Record<string, LikertValue>>({})
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (loading)
    return <div className='text-center text-black'>Memuat pertanyaan...</div>
  if (error) return <div className='text-center text-black'>{error}</div>
  if (!safeQuestions.length)
    return (
      <div className='text-center text-black'>
        Tidak ada pertanyaan tersedia
      </div>
    )

  const totalQuestions = safeQuestions.length
  const totalPages = Math.ceil(totalQuestions / QUESTIONS_PER_PAGE)
  const pageStartIndex = currentPage * QUESTIONS_PER_PAGE
  const pageEndIndex = Math.min(pageStartIndex + QUESTIONS_PER_PAGE, totalQuestions)
  const currentPageQuestions = safeQuestions.slice(pageStartIndex, pageEndIndex)

  const isCurrentPageAnswered = currentPageQuestions.every(
    (question) => answers[question.kode_soal] !== undefined
  )

  const answeredCount = safeQuestions.reduce((count, question) => {
    if (answers[question.kode_soal] !== undefined) {
      return count + 1
    }
    return count
  }, 0)

  const allAnswered = safeQuestions.every(
    (question) => answers[question.kode_soal] !== undefined
  )

  const handleSelectChoice = (questionCode: string, value: LikertValue) => {
    setSubmitError('')
    setAnswers((prev) => ({
      ...prev,
      [questionCode]: value,
    }))
  }

  const handleNext = () => {
    if (!isCurrentPageAnswered) {
      setSubmitError('Semua soal pada halaman ini wajib dijawab sebelum lanjut.')
      return
    }

    if (currentPage >= totalPages - 1) {
      return
    }

    setSubmitError('')
    setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1))
    scrollToPageTop()
  }

  const handlePrev = () => {
    if (currentPage <= 0) {
      return
    }

    setSubmitError('')
    setCurrentPage((prev) => Math.max(prev - 1, 0))
    scrollToPageTop()
  }

  const handleSubmit = async () => {
    if (!allAnswered) {
      setSubmitError('Semua pertanyaan wajib dijawab sebelum dikirim.')
      return
    }

    setSubmitError('')
    setIsSubmitting(true)

    const payload: MbSubmitPayload = {
      assessment_version: 'dna-it-v1',
      answers: safeQuestions.map((question) => {
        const likertValue = answers[question.kode_soal]
        const base = {
          likert_value: likertValue,
        }

        if (question.question_id) {
          return {
            ...base,
            question_id: question.question_id,
          }
        }

        return {
          ...base,
          kode_soal: question.kode_soal,
        }
      }),
    }

    try {
      const response = await fetch('/api/career-match-up/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      })

      if (!response.ok) {
        let message = 'Gagal mengirim jawaban. Silakan coba lagi.'
        try {
          const body = await response.json()
          message = body?.error || body?.message || message
        } catch {
          // no-op
        }
        throw new Error(message)
      }

      router.push('/career-match-up/result')
    } catch (submitErr) {
      const message =
        submitErr instanceof Error
          ? submitErr.message
          : 'Terjadi kesalahan saat mengirim jawaban.'
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className='mx-auto flex w-full max-w-3xl flex-col items-center gap-9 px-4 pt-28 pb-8 md:max-w-5xl md:pt-34'>
      <div className='w-full flex justify-start'>
        <Link href='/career-match-up'>
          <Button variant='outline' size='lg' className='w-fit'>
            <ChevronLeft />
            Kembali
          </Button>
        </Link>
      </div>

      <ProgressBar current={answeredCount} total={totalQuestions} />
      <p className='text-sm font-medium text-gray-700'>
        Halaman {currentPage + 1} dari {totalPages}
      </p>
      <div className='w-full flex flex-col gap-9'>
        {currentPageQuestions.map((question, idx) => (
          <QuestionCard
            key={question.question_id ?? question.kode_soal}
            question={question}
            index={pageStartIndex + idx + 1}
            selectedChoice={answers[question.kode_soal]}
            onSelectChoice={handleSelectChoice}
          />
        ))}
      </div>

      {submitError && (
        <p className='text-center text-sm text-red-500'>{submitError}</p>
      )}

      <div className='flex w-full flex-row justify-center gap-3'>
        <Button
          variant='outline'
          size='lg'
          className='w-full'
          onClick={handlePrev}
          disabled={currentPage === 0 || isSubmitting}
        >
          <ChevronLeft />
          Halaman Sebelumnya
        </Button>

        {currentPage < totalPages - 1 ? (
          <Button
            size='lg'
            className='w-full'
            onClick={handleNext}
            disabled={isSubmitting}
          >
            Halaman Berikutnya
            <ChevronRight />
          </Button>
        ) : (
          <Button
            size='lg'
            className='w-full'
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className='animate-spin' />
                Mengirim...
              </>
            ) : (
              'Kirim Jawaban'
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

// ProgressBar component (same as before)
interface ProgressBarProps {
  current: number
  total: number
}

const ProgressBar = ({ current, total }: ProgressBarProps) => {
  const percentage = Math.round((current / total) * 100)

  return (
    <>
      <div className='relative mx-auto w-full flex flex-row justify-center items-center gap-2'>
        <div className='h-4  w-full rounded-full bg-transparent border border-neutral-1000  max-w-3xl'>
          <div
            className='h-4 rounded-full bg-gradient-to-r from-primary-200 to-primary-500 from-0% to-134% transition-all duration-300'
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className='text-sm font-medium text-gray-700'>{percentage}%</span>
      </div>
      {current < total && (
        <div className='w-full bg-gradient-to-r from-primary-400 p-3 font-bold to-primary-600 rounded-[10px] text-center md:text-base text-sm text-white'>
          Awali tes dengan merespons pertanyaan di bawah ini
        </div>
      )}
    </>
  )
}

interface QuestionCardProps {
  question: MbQuestion
  index: number
  selectedChoice?: LikertValue
  onSelectChoice: (questionCode: string, value: LikertValue) => void
}

const QuestionCard = ({
  question,
  index,
  selectedChoice,
  onSelectChoice,
}: QuestionCardProps) => {
  const questionText = getQuestionText(question)

  return (
    <div className='w-full rounded-lg border border-neutral-1000 bg-white p-5 pb-10 shadow-md text-center'>
      <h2 className='mb-4 text-lg font-semibold text-gray-800'>
        {index}. {questionText}
      </h2>
      <div className='flex flex-row justify-between items-center'>
        {!isMobile() && <span className='text-green-200 font-bold'>Setuju</span>}
        {CHOICE_ITEMS.map((item) => {
          const isActive = selectedChoice === item.value
          return (
            <div key={item.value} className={item.wrapperClassName}>
              <button
                type='button'
                aria-label={item.label}
                aria-pressed={isActive}
                onClick={() => onSelectChoice(question.kode_soal, item.value)}
                className={`rounded-full w-full h-full transition-all duration-200 ${
                  isActive ? item.activeClassName || '' : ''
                } ${!isActive || !item.activeClassName ? 'bg-white' : ''}`}
                style={isActive ? item.activeStyle : undefined}
              />
            </div>
          )
        })}
        {!isMobile() && <span className='text-red-400 font-bold'>Tidak Setuju</span>}
      </div>
    </div>
  )
}
export default CareerMatchUpTest
