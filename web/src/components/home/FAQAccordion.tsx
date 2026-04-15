'use client'
import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
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
  return (
    <details
      className={cn(
        'bg-white text-colours-text-secondary border-primary-new-800 h-fit shadow-primary-new-700/40 rounded-[10px] border-solid md:p-3 py-1.5 px-3 shadow-md max-sm:shadow-none border', (isActive ? 'border-white' : ''),)
      }
    >
      <summary
        className='text-colours-text-primary h-fit cursor-pointer list-none *:float-right flex items-center justify-between text-[14px] font-medium max-sm:text-[12px]'
        onClick={() => setIsActive(!isActive)}
      >
        {question} {isActive ? <ChevronUp className='size-4' /> : <ChevronDown className='size-4' />}
      </summary>
      <p className='mt-2 mr-9 text-[12px] max-sm:text-[10px]'>{answer}</p>
    </details>
  )
}

export default Accordion
