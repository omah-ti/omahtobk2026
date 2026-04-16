// CareerMatchUpTest.tsx
'use client'
import { Button } from '@/components/ui/button'
import { isMobile } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import React, { useState } from 'react'

interface Question {
  kode_soal: string
  text_soal: string
}

interface CareerMatchUpTestProps {
  questions: Question[] | null | undefined
  loading?: boolean
  error?: string
}

const CareerMatchUpTest = ({
  questions,
  loading = false,
  error = '',
}: CareerMatchUpTestProps) => {
  const safeQuestions = Array.isArray(questions) ? questions : []

  if (loading)
    return <div className='text-center text-black'>Memuat pertanyaan...</div>
  if (error) return <div className='text-center text-black'>{error}</div>
  if (!safeQuestions.length)
    return (
      <div className='text-center text-black'>
        Tidak ada pertanyaan tersedia
      </div>
    )

  return (
    <div className='mx-auto flex w-full max-w-3xl flex-col items-center gap-9 px-4 py-8 md:max-w-5xl'>
      <ProgressBar current={1} total={safeQuestions.length} />
      <div className='w-full flex flex-col gap-9'>
        {safeQuestions.map((question, index) => (
          <QuestionCard key={question.kode_soal} question={question} index={index + 1} />
        ))}
      </div>
      <div className='flex flex-row gap-3'>
        <Link href='/career-match-up'>
          <Button variant="outline" size="lg" className='w-full'>
            <ChevronLeft />
            Kembali
          </Button>
        </Link>
        <Link href='/career-match-up/result'>
          <Button size="lg" className='w-full'>
            Selanjutnya
            <ChevronRight />
          </Button>
        </Link>
      </div>
    </div>
  )
}

// ProgressBar component (same as before)
interface ProgressBarProps {
  current: number
  total: number
}

const ProgressBar = ({ current, total }: ProgressBarProps) => (
  <>
    <div className='relative mx-auto w-full flex flex-row justify-center items-center gap-2'>
      <div className='h-4  w-full rounded-full bg-transparent border border-neutral-1000  max-w-3xl'>
        <div
          className='h-4 rounded-full bg-gradient-to-r from-primary-200 to-primary-500 from-0% to-134% transition-all duration-300'
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
      <span className='text-sm font-medium text-gray-700'>
        {(current / total) * 100}%
      </span>
    </div>
    {current < total && (
      <div className='w-full bg-gradient-to-r from-primary-400 p-3 font-bold to-primary-600 rounded-[10px] text-center md:text-base text-sm text-white'>
        Awali tes dengan merespons pertanyaan di bawah ini
      </div>
    )}
  </>
)

interface QuestionCardProps {
  question: Question
  index: number
}

const QuestionCard = ({ question, index }: QuestionCardProps) => {
  const [selectedChoice, setSelectedChoice] = useState<
    'strongYes' | 'yes' | 'neutral' | 'no' | 'strongNo' | null
  >(null)

  return (
    <div className='w-full rounded-lg border border-neutral-1000 bg-white p-5 pb-10 shadow-md text-center'>
      <h2 className='mb-4 text-lg font-semibold text-gray-800'>
        {index}. {question.text_soal}
      </h2>
      <div className='flex flex-row justify-between items-center'>
        {!isMobile() && (
          <span className='text-green-200 font-bold'>Setuju</span>
        )}
        <div className='rounded-full md:w-31.75 w-13 md:h-31.75 h-13 p-0.75 bg-green-200 relative'>
          <button
            type='button'
            aria-pressed={selectedChoice === 'strongYes'}
            onClick={() => setSelectedChoice('strongYes')}
            className='rounded-full w-full h-full bg-white transition-all duration-200'
            style={
              selectedChoice === 'strongYes'
                ? {
                  background:
                    'radial-gradient(60.91% 60.91% at 50% 50%, #FFF 0%, #1FC16B 100%)',
                }
                : undefined
            }
          />
        </div>

        <div className='rounded-full md:w-21.75 w-10.5 md:h-21.75 h-10.5 p-0.75 bg-green-200 relative'>
          <button
            type='button'
            aria-pressed={selectedChoice === 'yes'}
            onClick={() => setSelectedChoice('yes')}
            className='rounded-full w-full h-full bg-white transition-all duration-200'
            style={
              selectedChoice === 'yes'
                ? {
                  background:
                    'radial-gradient(60.91% 60.91% at 50% 50%, #FFF 0%, #1FC16B 100%)',
                }
                : undefined
            }
          />
        </div>

        <div className='rounded-full md:w-14.25 w-8 md:h-14.25 h-8 p-0.75 bg-gradient-to-r from-green-200 to-red-400 relative'>
          <button
            type='button'
            aria-pressed={selectedChoice === 'neutral'}
            onClick={() => setSelectedChoice('neutral')}
            className={`rounded-full w-full h-full transition-all duration-200 ${selectedChoice === 'neutral' ? 'bg-white/70' : 'bg-white'
              }`}
          />
        </div>

        <div className='rounded-full md:w-21.75 w-10.5 md:h-21.75 h-10.5 p-0.75 bg-red-400 relative'>
          <button
            type='button'
            aria-pressed={selectedChoice === 'no'}
            onClick={() => setSelectedChoice('no')}
            className='rounded-full w-full h-full bg-white transition-all duration-200'
            style={
              selectedChoice === 'no'
                ? {
                  background:
                    'radial-gradient(50% 50% at 50% 50%, #FFF 0%, #E70518 100%)',
                }
                : undefined
            }
          />
        </div>

        <div className='rounded-full md:w-31.75 w-13 md:h-31.75 h-13 p-0.75 bg-red-400 relative'>
          <button
            type='button'
            aria-pressed={selectedChoice === 'strongNo'}
            onClick={() => setSelectedChoice('strongNo')}
            className='rounded-full w-full h-full bg-white transition-all duration-200'
            style={
              selectedChoice === 'strongNo'
                ? {
                  background:
                    'radial-gradient(50% 50% at 50% 50%, #FFF 0%, #E70518 100%)',
                }
                : undefined
            }
          />
        </div>
        {!isMobile() && (
          <span className='text-red-400 font-bold'>Tidak Setuju</span>
        )}
      </div>
    </div>
  )
}
export default CareerMatchUpTest
