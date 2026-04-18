/**
 * @description Component ini dibuat oleh AI (VIBE CODING) jadi expect error somewhere (kurang optimal).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import StyledCard from '@/components/tryout/styled-card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { saveSubtestAnswers, submitSubtest } from '@/lib/fetch/tryout-test'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  LoaderCircle,
  Square,
  SquareCheckBig,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

type Variant = 'multiple_choice' | 'true_false' | 'uraian'

interface AnswerCardProps {
  variant?: Variant
  soal?: any
  soalSemua: any[]
  time: Date
  currentSubtest: string
  initialAnswers?: Array<{ kode_soal: string; jawaban: string }>
}

interface AnswerPayload {
  kode_soal: string
  jawaban: string | null
}

interface LocalAnswer extends AnswerPayload {
  updatedAt: number
  synced: boolean
}

const AnswerCard = ({
  time,
  currentSubtest,
  initialAnswers = [],
  variant = 'multiple_choice',
  soalSemua,
}: AnswerCardProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const basePath = pathname.slice(0, pathname.lastIndexOf('/'))
  const currentNumber =
    Number(pathname.slice(pathname.lastIndexOf('/') + 1)) || 1
  const localStorageKey = `tryout_answers_${currentSubtest}`

  // State management
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>({})
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>(
    'idle'
  )
  const [submitting, setSubmitting] = useState(false)
  const [isGracePeriod, setIsGracePeriod] = useState(false)
  const [graceTimeRemaining, setGraceTimeRemaining] = useState<number>(1 * 60) // 1 minutes in seconds
  const [dialogOpen, setDialogOpen] = useState(false)

  const mapToPayload = (items: Record<string, LocalAnswer>): AnswerPayload[] => {
    return Object.values(items)
      .filter((item) => (item.jawaban || '').trim().length > 0)
      .map((item) => ({
        kode_soal: item.kode_soal,
        jawaban: item.jawaban,
      }))
  }

  // Use the time prop directly as timeLimit instead of state
  const timeLimit = time ? time.getTime() : null

  // Derived values
  const totalQuestions = soalSemua.length
  const clampedNumber = Math.min(Math.max(currentNumber, 1), totalQuestions)
  const currentSoal = soalSemua[clampedNumber - 1]
  const isLastQuestion = clampedNumber === totalQuestions

  // Format time remaining for display
  const formatTimeRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  // Submission handler
  const submitAllAnswers = useCallback(async () => {
    if (hasSubmitted) return

    try {
      setSubmitting(true)
      setSyncStatus('syncing')

      const answersToSubmit = mapToPayload(answers)
      const result = await submitSubtest(
        currentSubtest,
        { answers: answersToSubmit },
        '',
        true
      )

      localStorage.removeItem(localStorageKey)
      setHasSubmitted(true)
      if (timerRef.current) clearInterval(timerRef.current)
      router.push('/dashboard')
      toast.success('Jawaban berhasil dikumpulkan!', {
        position: 'bottom-left',
      })
      return result
    } catch (error) {
      localStorage.removeItem(localStorageKey)
      console.error('Submission error:', error)
      toast.error(
        'Jawaban gagal dikumpulkan. Silahkan coba lagi dari dashboard.',
        {
          position: 'bottom-left',
        }
      )
      router.push('/dashboard')
    } finally {
      setSubmitting(false)
      setSyncStatus('idle')
    }
  }, [answers, hasSubmitted, localStorageKey, currentSubtest, router])

  // Time limit handler
  useEffect(() => {
    if (!timeLimit || isNaN(timeLimit)) return
    const checkTime = () => {
      const now = Date.now()
      const gracePeriodStart = timeLimit
      const gracePeriodEnd = timeLimit + 1 * 60 * 1000 // 1 minute grace period
      const fiveSecondsBeforeGracePeriodEnd = gracePeriodEnd - 5000
      // Only enter grace period if current time is past the time limit
      if (now >= gracePeriodStart && now < gracePeriodEnd && !hasSubmitted) {
        // Enter grace period if not already in it
        if (!isGracePeriod) {
          setIsGracePeriod(true)
          setDialogOpen(true)

          // Show toast notification when entering grace period
          toast.warning('Waktu sudah habis!', {
            description: `Anda berada di masa tenggang selama 1 menit. Silahkan kumpulkan jawaban.`,
            position: 'bottom-left',
            duration: 5000,
          })
        }

        // Calculate and update grace time remaining
        const remainingMs = Math.max(0, gracePeriodEnd - now)
        const remainingSec = Math.ceil(remainingMs / 1000)
        setGraceTimeRemaining(remainingSec)
      }
      // If grace period has ended and hasn't submitted
      else if (now >= fiveSecondsBeforeGracePeriodEnd && !hasSubmitted) {
        setGraceTimeRemaining(0)
        // Optional: Auto-submit when grace period ends
        submitAllAnswers()
      }
      // If we're still within the normal time limit, reset grace period if it was somehow activated
      else if (now < gracePeriodStart && isGracePeriod) {
        setIsGracePeriod(false)
        setDialogOpen(false)
      }
    }

    checkTime()
    timerRef.current = setInterval(checkTime, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [timeLimit, hasSubmitted, isGracePeriod, submitAllAnswers])

  // Sync logic
  const syncWithServer = useCallback(
    async (force = false) => {
      try {
        const savedAnswers = localStorage.getItem(localStorageKey)
        if (!savedAnswers) return

        const savedMap: Record<string, LocalAnswer> = JSON.parse(savedAnswers)
        const answersObj = Object.values(savedMap)
        const answersToSync = force
          ? answersObj
          : answersObj.filter((a) => !a.synced)
        if (!answersToSync.length && !force) return

        setSyncStatus('syncing')
        const result = await saveSubtestAnswers(
          currentSubtest,
          { answers: answersToSync },
          '',
          true
        )

        setAnswers((prev) => {
          const merged = { ...prev }
          result.data.answers?.forEach((sa: AnswerPayload) => {
            if (sa?.kode_soal) {
              merged[sa.kode_soal] = {
                ...sa,
                updatedAt: Date.now(),
                synced: true,
              }
            }
          })
          localStorage.setItem(localStorageKey, JSON.stringify(merged))
          return merged
        })

        setSyncStatus('idle')
      } catch (error) {
        console.error('Sync error:', error)
        setSyncStatus('error')
        toast.error('Gagal mensinkronisasi Tryout', {
          description:
            'Sepertinya terdapat masalah jaringan atau anda tidak mengumpulkan jawaban subtes. Silahkan ulang Tryout.',
          position: 'bottom-left',
        })
      }
    },
    [localStorageKey, currentSubtest]
  )

  // Initial load
  useEffect(() => {
    try {
      const savedAnswers = localStorage.getItem(localStorageKey)
      if (savedAnswers) {
        setAnswers(JSON.parse(savedAnswers))
      } else if (initialAnswers.length > 0) {
        const mapped = initialAnswers.reduce<Record<string, LocalAnswer>>(
          (acc, item) => {
            acc[item.kode_soal] = {
              kode_soal: item.kode_soal,
              jawaban: item.jawaban,
              updatedAt: Date.now(),
              synced: true,
            }
            return acc
          },
          {}
        )
        setAnswers(mapped)
        localStorage.setItem(localStorageKey, JSON.stringify(mapped))
      }

      const interval = setInterval(syncWithServer, 210000) // Sync every 3.5 minutes
      return () => clearInterval(interval)
    } catch (error) {
      console.error('Initial load error:', error)
    }
  }, [localStorageKey, syncWithServer, initialAnswers])

  // Answer handling
  const updateAnswer = useCallback(
    (kodeSoal: string, jawaban: string | null) => {
      // Don't allow answer updates during grace period
      if (isGracePeriod) return

      setAnswers((prev) => {
        const updated = {
          ...prev,
          [kodeSoal]: {
            kode_soal: kodeSoal,
            jawaban,
            updatedAt: Date.now(),
            synced: false,
          },
        }
        localStorage.setItem(localStorageKey, JSON.stringify(updated))

        // Use setTimeout to dispatch event asynchronously after the current render cycle
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.dispatchEvent(new Event('tryout_answer_updated'))
          }, 0)
        }

        return updated
      })
    },
    [localStorageKey, isGracePeriod]
  )

  // Render helpers
  const renderQuestionComponent = () => {
    if (!currentSoal)
      return (
        <div className='p-4 text-center'>Question content not available</div>
      )

    const commonProps = {
      soal: currentSoal,
      savedAnswer: answers[currentSoal.kode_soal]?.jawaban || null,
      onAnswerChange: (value: string) =>
        updateAnswer(currentSoal.kode_soal, value),
      disabled: isGracePeriod, // Disable inputs during grace period
    }

    switch (variant) {
      case 'multiple_choice':
        return currentSoal.pilihan_ganda ? (
          <MultipleChoice {...commonProps} />
        ) : null
      case 'true_false':
        return currentSoal.true_false ? <TrueFalse {...commonProps} /> : null
      default:
        return currentSoal.uraian ? <TextAnswer {...commonProps} /> : null
    }
  }

  return (
    <>
      <AlertDialog
        open={dialogOpen && isGracePeriod}
        onOpenChange={setDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Waktu Habis!</AlertDialogTitle>
            <AlertDialogDescription>
              Waktu mengerjakan sudah habis. Silahkan kumpulkan jawaban {currentSubtest === 'subtest_pm' 
                ? 'untuk mengakhiri tryout.' 
                : 'untuk melanjutkan ke subtes berikutnya.'} 
              Jika jawaban tidak dikumpulkan, tryout akan dianggap tidak valid. 
              Tekan Tombol di bawah untuk submit jawaban, tombol wajib ditekan untuk meng-submit jawaban.
              {/* <div className='mt-2 text-center font-bold text-red-500'>
                {formatTimeRemaining(graceTimeRemaining)}
              </div> */}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={submitAllAnswers}
              disabled={submitting || syncStatus === 'syncing'}
              className='group w-full'
            >
              {submitting ? (
                <>
                  <LoaderCircle className='animate-spin' />
                  Memproses...
                </>
              ) : (
                <>
                  {currentSubtest === 'subtest_pm' 
                    ? `Akhiri Tryout (${formatTimeRemaining(graceTimeRemaining)})` 
                    : `Lanjut Subtes Berikutnya (${formatTimeRemaining(graceTimeRemaining)})`}
                  <ArrowRight className='group-hover:translate-x-1' />
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <StyledCard title='Jawaban' className='relative gap-1'>
        <main className='flex h-full flex-col'>
          <section className='mt-2 mb-8 h-96 w-full overflow-y-scroll'>
            {renderQuestionComponent()}
          </section>

          <section className='absolute inset-x-4 bottom-4 grid grid-cols-2 gap-2 bg-white'>
            <Link
              href={
                clampedNumber > 1
                  ? `${basePath}/${clampedNumber - 1}`
                  : pathname
              }
              className={cn(
                buttonVariants({ variant: 'secondaryOutline' }),
                'border-[1.5px]',
                (clampedNumber === 1 || isGracePeriod) &&
                  'pointer-events-none opacity-50'
              )}
              replace
            >
              <ArrowLeft />
              Back
            </Link>

            {isGracePeriod ? (
              <button
                onClick={() => setDialogOpen(true)}
                className={cn(
                  buttonVariants({ variant: 'secondary' }),
                  'flex items-center justify-center gap-2'
                )}
              >
                {currentSubtest === 'subtest_pm' ? 'Akhiri Tryout' : 'Lanjut Subtes'}
                <Check size={16} />
              </button>
            ) : isLastQuestion ? (
              <button
                onClick={submitAllAnswers}
                disabled={submitting || syncStatus === 'syncing'}
                className={cn(
                  buttonVariants({ variant: 'secondary' }),
                  'flex items-center justify-center gap-2'
                )}
              >
                {submitting ? (
                  <>
                    <LoaderCircle className='animate-spin' />
                    Memproses...
                  </>
                ) : (
                  <>
                    {currentSubtest === 'subtest_pm'
                      ? 'Akhiri Tryout'
                      : 'Lanjut Subtes'}
                    <Check size={16} />
                  </>
                )}
              </button>
            ) : (
              <Link
                href={`${basePath}/${clampedNumber + 1}`}
                className={cn(
                  buttonVariants({ variant: 'secondary' }),
                  isGracePeriod && 'pointer-events-none opacity-50'
                )}
                replace
              >
                Next
                <ArrowRight />
              </Link>
            )}
          </section>
        </main>
      </StyledCard>
    </>
  )
}

// Component implementations updated to support disabled state
const MultipleChoice = ({
  soal,
  savedAnswer,
  onAnswerChange,
  disabled = false,
}: {
  soal: any
  savedAnswer: string | null
  onAnswerChange: (value: string) => void
  disabled?: boolean
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(
    savedAnswer
  )

  useEffect(() => {
    setSelectedAnswer(savedAnswer)
  }, [savedAnswer])

  const handleSelect = (answerId: string) => {
    if (disabled) return
    setSelectedAnswer(answerId)
    onAnswerChange(answerId)
  }

  return (
    <div className=''>
      {soal.pilihan_ganda?.map((option: any, idx: number) => (
        <button
          key={option.soal_pilihan_ganda_id}
          className={`flex w-full items-center justify-between gap-4 rounded-lg px-5 py-5 text-start font-semibold transition-colors ease-in-out ${
            selectedAnswer === option.soal_pilihan_ganda_id
              ? 'bg-primary-500 text-white'
              : 'border-b border-neutral-200 text-black'
          } ${disabled ? 'cursor-not-allowed opacity-80' : ''}`}
          onClick={() => handleSelect(option.soal_pilihan_ganda_id)}
          disabled={disabled}
        >
          <div className='flex items-center gap-4'>
            <h3 className='mr-2 font-bold'>{String.fromCharCode(97 + idx)}.</h3>{' '}
            {/* a, b, c, d */}
            <h2>{option.pilihan}</h2>
          </div>

          <div
            className={`size-4 shrink-0 rounded-full ${selectedAnswer === option.soal_pilihan_ganda_id ? 'bg-success-300' : 'bg-neutral-200'}`}
          />
        </button>
      ))}
    </div>
  )
}

const TextAnswer = ({
  savedAnswer,
  onAnswerChange,
  disabled = false,
}: {
  soal: any
  savedAnswer: string | null
  onAnswerChange: (value: string) => void
  disabled?: boolean
}) => {
  const [text, setText] = useState(savedAnswer || '')

  useEffect(() => {
    setText(savedAnswer || '')
  }, [savedAnswer])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (disabled) return
    const newValue = e.target.value
    setText(newValue)
    onAnswerChange(newValue)
  }

  return (
    <Textarea
      placeholder='Ketik jawabanmu disini'
      value={text}
      onChange={handleChange}
      disabled={disabled}
      className={`w-full ${disabled ? 'cursor-not-allowed opacity-80' : ''}`}
    />
  )
}

// Fixed TrueFalse component with proper typings and handling
const TrueFalse = ({
  soal,
  savedAnswer,
  onAnswerChange,
  disabled,
}: {
  soal: any
  savedAnswer: string | null
  onAnswerChange: (value: string) => void
  disabled?: boolean
}) => {
  // Track only the IDs of options that are marked as TRUE
  const [trueAnswerIds, setTrueAnswerIds] = useState<string[]>(() => {
    // Initialize from savedAnswer immediately during state initialization
    if (!savedAnswer) return []

    try {
      return savedAnswer.split(/[,|]/).filter(Boolean)
    } catch (error) {
      console.error('Error parsing saved true/false answers:', error)
      return []
    }
  })

  // Track last processed savedAnswer to avoid circular updates
  const lastProcessedAnswer = useRef(savedAnswer)

  // Update when savedAnswer changes (e.g., when navigating back to this question)
  useEffect(() => {
    // Skip if this savedAnswer was already processed or is the same as our current state
    if (savedAnswer === lastProcessedAnswer.current) return

    // Update our ref with the current savedAnswer
    lastProcessedAnswer.current = savedAnswer

    if (!savedAnswer) {
      setTrueAnswerIds([])
      return
    }

    try {
      const ids = savedAnswer.split(/[,|]/).filter(Boolean)
      setTrueAnswerIds(ids)
    } catch (error) {
      console.error('Error parsing saved true/false answers:', error)
      setTrueAnswerIds([])
    }
  }, [savedAnswer])

  // Use a ref to track outgoing answers to prevent circular updates
  const lastEmittedAnswer = useRef<string | null>(null)

  // Sync answers with parent component immediately when selections change
  useEffect(() => {
    // Create a comma-separated list of IDs that are marked as true
    const newAnswer = trueAnswerIds.length > 0 ? trueAnswerIds.join(',') : null

    // Skip if the new answer is the same as what we last sent to parent
    if (newAnswer === lastEmittedAnswer.current) return

    // Also skip if our state exactly matches the savedAnswer from parent
    if (newAnswer === savedAnswer) return

    // Update our ref with what we're about to send
    lastEmittedAnswer.current = newAnswer

    // Update parent with new answer
    onAnswerChange(newAnswer || '') // Convert null to empty string to fix type error
  }, [trueAnswerIds, onAnswerChange, savedAnswer])

  const handleSelect = (optionId: string, isTrue: boolean) => {
    if (disabled) return

    setTrueAnswerIds((prev) => {
      if (isTrue) {
        // Add ID if it's not already included
        return prev.includes(optionId) ? prev : [...prev, optionId]
      } else {
        // Remove ID if it's marked as false
        return prev.filter((id) => id !== optionId)
      }
    })
  }

  return (
    <div className='flex flex-col gap-1'>
      {soal.true_false?.map((option: any, idx: number) => {
        const isTrue = trueAnswerIds.includes(option.soal_true_false_id)

        return (
          <div
            key={option.soal_true_false_id}
            className={`flex w-full items-center justify-between gap-4 rounded-lg border-b border-neutral-200 px-4 py-4 text-start font-semibold text-black transition-colors ease-in-out ${disabled ? 'cursor-not-allowed opacity-80' : ''}`}
          >
            <div className='flex gap-4 text-black'>
              <h2 className='self-center font-bold'>
                {String.fromCharCode(97 + idx)}.
              </h2>
              <h1>{option.pilihan_tf}</h1>
            </div>

            <div className='flex gap-4'>
              <Button
                onClick={() => handleSelect(option.soal_true_false_id, true)}
                variant='ghost'
                size='icon'
                className='relative hover:bg-transparent'
                disabled={disabled}
              >
                {isTrue ? <SquareCheckBig /> : <Square />}
                <span className='absolute -top-2 text-xs font-light text-neutral-800'>
                  Benar
                </span>
              </Button>

              <Button
                onClick={() => handleSelect(option.soal_true_false_id, false)}
                variant='ghost'
                size='icon'
                className='relative hover:bg-transparent'
                disabled={disabled}
              >
                {!isTrue ? <SquareCheckBig /> : <Square />}
                <span className='absolute -top-2 text-xs font-light text-neutral-800'>
                  Salah
                </span>
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default AnswerCard
