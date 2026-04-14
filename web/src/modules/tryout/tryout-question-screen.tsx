'use client'

import { ArrowLeft, ArrowRight, Flag, LogOut, Menu, X } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  SUBTEST_META,
  isSubtestCode,
  mockFetchTryoutQuestion,
  type SubtestCode,
  type TryoutQuestion,
} from './dummy-questions'

type TryoutQuestionScreenProps = {
  subtest: string
  questionNumber: number
}

type TrueFalseAnswer = Record<number, 'true' | 'false'>

const cardShadow =
  'shadow-[0_3px_10px_rgba(0,0,0,0.10),0_2px_4px_rgba(0,0,0,0.08)]'

const numberButtonBase =
  'rounded-md border py-2 text-[14px] font-medium transition-colors'

const actionButtonOutline =
  'flex items-center justify-center gap-2 rounded-lg border border-[#0D3388] bg-white px-4 py-[10px] text-[14px] font-bold text-[#0D3388] transition-colors hover:bg-[#0D3388] hover:text-white md:text-[16px]'

const actionButtonSolid =
  'flex items-center justify-center gap-2 rounded-lg border border-[#0D3388] bg-[#0D3388] px-4 py-[10px] text-[14px] font-bold text-white transition-colors hover:bg-[#0A276A] md:text-[16px]'

const getQuestionPath = (subtest: SubtestCode, questionNumber: number) =>
  `/tryout/${subtest}/${questionNumber}`

const TryoutQuestionScreen = ({
  subtest,
  questionNumber,
}: TryoutQuestionScreenProps) => {
  const router = useRouter()
  const [question, setQuestion] = useState<TryoutQuestion | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOption, setSelectedOption] = useState<keyof NonNullable<TryoutQuestion['options']> | null>(null)
  const [shortAnswer, setShortAnswer] = useState('')
  const [trueFalseAnswer, setTrueFalseAnswer] = useState<TrueFalseAnswer>({})
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isSmallScreen, setIsSmallScreen] = useState(false)

  const subtestValid = isSubtestCode(subtest)

  const subtestInfo = useMemo(
    () => (subtestValid ? SUBTEST_META[subtest] : null),
    [subtest, subtestValid]
  )

  useEffect(() => {
    let active = true

    const loadQuestion = async () => {
      setIsLoading(true)
      const data = await mockFetchTryoutQuestion(subtest, questionNumber)

      if (active) {
        setQuestion(data)
        setSelectedOption(null)
        setShortAnswer('')
        setTrueFalseAnswer({})
        setIsLoading(false)
      }
    }

    loadQuestion()

    return () => {
      active = false
    }
  }, [subtest, questionNumber])

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 400)
    }

    // Set initial value
    setIsSmallScreen(window.innerWidth < 400)

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (!subtestValid) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-white p-6'>
        <div className='w-full max-w-[520px] rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-center text-neutral-700'>
          Subtest tidak ditemukan.
        </div>
      </div>
    )
  }

  const currentSubtest = SUBTEST_META[subtest]
  const totalQuestions = currentSubtest.totalQuestions

  const navigateToQuestion = (number: number) => {
    setIsMobileSidebarOpen(false)
    router.push(getQuestionPath(subtest, number))
  }

  const renderSidebarContent = () => (
    <div className='flex h-full flex-col gap-6'>
      <div className={`rounded-lg bg-white p-6 ${cardShadow}`}>
        <p className='text-[16px] font-bold text-neutral-900'>
          Hafidz Kurniawan
        </p>
      </div>

      <div className={`mt-1 rounded-lg bg-white p-4 ${cardShadow}`}>
        <h2 className='text-[16px] font-bold text-neutral-900'>Daftar Soal</h2>

        <div className='mt-4 grid grid-cols-4 gap-2'>
          {Array.from({ length: totalQuestions }, (_, index) => {
            const number = index + 1
            const isActive = number === questionNumber

            return (
              <button
                key={`${subtest}-${number}`}
                type='button'
                onClick={() => navigateToQuestion(number)}
                className={`${numberButtonBase} ${
                  isActive
                    ? 'border-[#0D3388] bg-[#0D3388] text-white'
                    : 'border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100'
                }`}
              >
                {number}
              </button>
            )
          })}
        </div>
      </div>

      <button
        type='button'
        className='mt-auto flex w-full items-center justify-center gap-2 rounded-lg border border-[#FB3748] bg-white py-[10px] text-[16px] font-bold text-[#FB3748] transition-colors hover:bg-[#FB3748]/10'
      >
        <LogOut size={18} />
        Log Out
      </button>
    </div>
  )

  if (questionNumber < 1 || questionNumber > totalQuestions) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-white p-6'>
        <div className='w-full max-w-[520px] rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-center'>
          <p className='text-neutral-700'>Nomor soal tidak valid.</p>
          <button
            type='button'
            onClick={() => router.push(getQuestionPath(subtest, 1))}
            className='mt-4 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700'
          >
            Kembali ke Soal 1
          </button>
        </div>
      </div>
    )
  }

  const renderMultipleChoice = () => {
    if (!question?.options) {
      return null
    }

    const options = Object.entries(question.options) as Array<
      [keyof typeof question.options, string]
    >

    return (
      <section className='rounded-lg border border-neutral-200 bg-white'>
        <div className='rounded-t-lg bg-slate-100 px-[14px] py-[14px] text-[13px] md:text-[15px] font-bold text-neutral-900'>
          Pilih satu jawaban yang benar!
        </div>

        <div className='divide-y divide-neutral-200 px-[14px]'>
          {options.map(([key, value]) => {
            const checked = selectedOption === key

            return (
              <label
                key={key}
                className='flex cursor-pointer items-center gap-3 py-4 text-[13px] md:text-[15px] text-neutral-800'
              >
                <span
                  className={`flex size-5 items-center justify-center rounded-full border-2 ${
                    checked
                      ? 'border-[#0D3388] bg-[#0D3388]'
                      : 'border-neutral-300 bg-white'
                  }`}
                >
                  <input
                    type='radio'
                    checked={checked}
                    onChange={() => setSelectedOption(key)}
                    className='sr-only'
                  />
                </span>
                {/* <span className='font-semibold uppercase'>{key}.</span> */}
                <span>{value}</span>
              </label>
            )
          })}
        </div>
      </section>
    )
  }

  const renderMultipleTrueFalse = () => {
    if (!question?.statements) {
      return null
    }

    const statements = question.statements

    return (
      <section className='rounded-lg border border-neutral-200 bg-white'>
        <div className='rounded-t-lg bg-slate-100 px-[14px] py-[14px] text-[13px] md:text-[15px] font-bold text-neutral-900'>
          Tentukan kebenaran pernyataan berikut!
        </div>

        <div className=''>
          <table className='w-full table-fixed border-collapse text-[13px] md:text-[14px]'>
            <thead>
              <tr>
                <th className='border-b border-neutral-200 px-3 py-2 text-left font-bold'>
                  Pernyataan
                </th>
                <th className='w-20 border-b border-neutral-200 px-3 py-2 text-center font-bold'>
                  Benar
                </th>
                <th className='w-20 border-b border-neutral-200 px-3 py-2 text-center font-bold'>
                  Salah
                </th>
              </tr>
            </thead>
            <tbody>
              {statements.map((statement, index) => {
                const rowIndex = index + 1
                const chosen = trueFalseAnswer[rowIndex]
                const isLastRow = index === statements.length - 1

                return (
                  <tr key={`${question.id}-statement-${rowIndex}`}>
                    <td
                      className={`${
                        isLastRow ? '' : 'border-b border-neutral-200'
                      } px-3 py-3 text-neutral-800 whitespace-normal break-words`}
                    >
                      {statement}
                    </td>
                    <td
                      className={`${
                        isLastRow ? '' : 'border-b border-neutral-200'
                      } px-3 py-3 text-center`}
                    >
                      <input
                        type='radio'
                        name={`statement-${rowIndex}`}
                        checked={chosen === 'true'}
                        onChange={() =>
                          setTrueFalseAnswer((previous) => ({
                            ...previous,
                            [rowIndex]: 'true',
                          }))
                        }
                        className='size-4 accent-[#0D3388]'
                      />
                    </td>
                    <td
                      className={`${
                        isLastRow ? '' : 'border-b border-neutral-200'
                      } px-3 py-3 text-center`}
                    >
                      <input
                        type='radio'
                        name={`statement-${rowIndex}`}
                        checked={chosen === 'false'}
                        onChange={() =>
                          setTrueFalseAnswer((previous) => ({
                            ...previous,
                            [rowIndex]: 'false',
                          }))
                        }
                        className='size-4 accent-[#0D3388]'
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  const renderShortAnswer = () => (
    <section className='rounded-lg border border-neutral-200 bg-white'>
      <div className='rounded-t-lg bg-slate-100 px-[14px] py-[14px] text-[13px] md:text-[15px] font-bold text-neutral-900'>
        Masukkan jawaban singkat!
      </div>

      <div className='p-[14px]'>
        <textarea
          value={shortAnswer}
          onChange={(event) => setShortAnswer(event.target.value)}
          rows={8}
          placeholder='Ketik jawabanmu disini'
          className='w-full rounded-lg border border-neutral-200 bg-white p-[18px] text-[13px] md:text-[15px] text-neutral-900 placeholder:text-neutral-500 focus:border-primary-300 focus:outline-none'
        />
      </div>
    </section>
  )

  const renderAnswerInput = () => {
    if (!question) {
      return null
    }

    if (question.type === 'multiple_choice') {
      return renderMultipleChoice()
    }

    if (question.type === 'multiple_true_false') {
      return renderMultipleTrueFalse()
    }

    return renderShortAnswer()
  }

  const renderActions = () => {
    const isFirst = questionNumber === 1
    const isLast = questionNumber === totalQuestions
    const showSideBySideNavigation = !isFirst

    return (
      <section className='rounded-lg bg-white p-[14px] shadow-md'>
        <div
          className={`flex items-center gap-3 ${
            showSideBySideNavigation ? '' : 'flex-wrap'
          }`}
        >
          {!isFirst && (
            <button
              type='button'
              onClick={() => router.push(getQuestionPath(subtest, questionNumber - 1))}
              className={`${actionButtonOutline} ${
                showSideBySideNavigation ? 'flex-1' : 'w-full'
              }`}
            >
              <ArrowLeft size={18} />
              Sebelumnya
            </button>
          )}

          {!isLast ? (
            <button
              type='button'
              onClick={() => router.push(getQuestionPath(subtest, questionNumber + 1))}
              className={`${actionButtonSolid} ${
                showSideBySideNavigation ? 'flex-1' : 'w-full'
              }`}
            >
              Selanjutnya
              <ArrowRight size={18} />
            </button>
          ) : (
            <button
              type='button'
              className={`flex items-center justify-center gap-2 rounded-lg border border-emerald-600 bg-emerald-600 px-4 py-[10px] text-[14px] font-bold text-white transition-colors hover:bg-emerald-700 md:text-[16px] ${
                showSideBySideNavigation ? 'flex-1' : 'w-full'
              }`}
            >
              <Flag size={18} />
              Finish Attempt
            </button>
          )}
        </div>
      </section>
    )
  }

  return (
    <div className='h-screen bg-white lg:flex'>
      {isMobileSidebarOpen && (
        <div className='fixed inset-0 z-40 bg-black/40 lg:hidden'>
          <div
            className='absolute inset-0'
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <aside className='relative h-full w-[86%] max-w-[360px] bg-slate-50 p-[10px]'>
            <button
              type='button'
              onClick={() => setIsMobileSidebarOpen(false)}
              className='mb-3 flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[14px] font-semibold text-neutral-700'
            >
              <X size={16} />
              Tutup
            </button>
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      <aside className='hidden bg-slate-50 p-[6px] md:p-8 lg:block lg:h-screen lg:w-1/4'>
        {renderSidebarContent()}
      </aside>

      <main className='w-full overflow-y-auto bg-white p-[6px] md:p-6 lg:h-screen lg:w-3/4 lg:p-10'>
        <section
          className='rounded-xl border border-neutral-200 bg-slate-50 p-[10px] md:p-6 shadow-lg'
        >
          <div className='flex flex-col gap-4 md:gap-6'>
            <header className='flex flex-col gap-3 md:gap-4'>
              {/* First row: Mobile - Nomor, Sisa Waktu, Menu | Desktop - Nomor, Subtest, Sisa Waktu */}
              <div className='flex items-center gap-3 md:gap-4'>
                <div className='flex-shrink-0 rounded-lg border border-neutral-200 bg-white px-[14px] py-[14px] text-[14px] md:text-[16px] font-bold text-neutral-900 shadow-sm'>
                  Nomor {questionNumber}
                </div>

                {/* Desktop only: Subtest in the middle */}
                <div className='hidden md:block flex-1 rounded-lg border border-neutral-200 bg-white px-4 py-[14px] text-center text-[14px] md:text-[16px] font-bold text-neutral-900 shadow-sm'>
                  {currentSubtest.title}
                </div>

                <div className='flex-1 md:flex-shrink-0 rounded-lg border border-neutral-200 bg-white px-[14px] py-[14px] text-[14px] md:text-[16px] font-bold text-[#FB3748] shadow-sm text-center'>
                  {!isSmallScreen && 'Sisa Waktu : '}00:00:00
                </div>

                <button
                  type='button'
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className='flex-shrink-0 flex items-center justify-center rounded-lg border border-neutral-200 bg-white p-[14px] text-neutral-900 shadow-sm lg:hidden'
                  aria-label='Buka daftar soal'
                >
                  <Menu size={20} />
                </button>
              </div>

              {/* Second row: Mobile only - Subtest full width */}
              <div className='md:hidden w-full rounded-lg border border-neutral-200 bg-white px-4 py-[14px] text-center text-[14px] font-bold text-neutral-900 shadow-sm'>
                {currentSubtest.title}
              </div>
            </header>

            <div className='grid grid-cols-1 gap-6 lg:grid-cols-12'>
              <article
                className='rounded-lg border border-neutral-200 bg-white py-6 px-3 md:p-6 lg:col-span-7'
              >
                {isLoading ? (
                  <div className='rounded-md bg-neutral-100 p-6 text-center text-neutral-600'>
                    Memuat soal...
                  </div>
                ) : question ? (
                  <div className='flex flex-col gap-6'>
                    {question.imageUrl && (
                      <Image
                        src={question.imageUrl}
                        alt={`Gambar soal ${question.number}`}
                        width={900}
                        height={420}
                        className='h-auto w-full rounded-lg border border-neutral-200 object-cover'
                        unoptimized
                      />
                    )}
                    <p className='text-[14px] md:text-[16px] leading-relaxed text-neutral-800'>
                      {question.questionText}
                    </p>
                    {/* <p className='text-[15px] leading-relaxed text-neutral-700'>
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                      Integer posuere erat a ante venenatis dapibus posuere
                      velit aliquet. Maecenas faucibus mollis interdum.
                    </p>
                    <p className='text-[15px] leading-relaxed text-neutral-700'>
                      Cras mattis consectetur purus sit amet fermentum. Etiam
                      porta sem malesuada magna mollis euismod. Donec id elit
                      non mi porta gravida at eget metus.
                    </p> */}
                  </div>
                ) : (
                  <div className='rounded-md bg-neutral-100 p-6 text-center text-neutral-600'>
                    Soal tidak ditemukan.
                  </div>
                )}
              </article>

              <div className='flex flex-col gap-6 lg:col-span-5'>
                {renderAnswerInput()}
                {renderActions()}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default TryoutQuestionScreen
