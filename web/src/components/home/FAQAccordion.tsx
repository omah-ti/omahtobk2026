'use client'
import React, { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  question?: string
  answer?: string
}

const Accordion = ({
  question = 'Your Question goes here?',
  answer = 'Accordion description goes here, try to keep it under 2 lines so it looks good and minmal, besok',
}: Props) => {
  const [isActive, setIsActive] = useState(false)
  const contentId = useId()

  return (
    <div
      className={cn(
        'bg-white text-colours-text-secondary border-primary-new-800 h-fit shadow-primary-new-700/40 rounded-[10px] border-solid md:p-3 py-1.5 px-3 shadow-md max-sm:shadow-none border',
        isActive ? 'border-white' : ''
      )}
    >
      <button
        type='button'
        aria-expanded={isActive}
        aria-controls={contentId}
        className='text-colours-text-primary h-fit w-full cursor-pointer flex items-center justify-between text-left text-[16px] font-medium max-sm:text-[12px]'
        onClick={() => setIsActive((prev) => !prev)}
      >
        <span>{question}</span>
        <ChevronDown
          className={cn(
            'size-4 transition-transform duration-300 ease-out',
            isActive ? 'rotate-180' : 'rotate-0'
          )}
        />
      </button>

      <div
        id={contentId}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out',
          isActive ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className='overflow-hidden'>
          <p
            className={cn(
              'mr-9 text-[16px] max-sm:text-[12px] leading-[21px] transition-all duration-300 ease-out',
              isActive ? 'mt-2 opacity-100' : 'mt-0 opacity-0'
            )}
          >
            {answer}
          </p>
        </div>
      </div>
    </div>
  )
}

export default Accordion
