'use client'
import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

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
      className={
        'bg-neutral-25 text-colours-text-secondary border-primary-new-800 shadow-primary-new-700/40 rounded-[10px] border-solid p-3 shadow-md max-sm:shadow-none ' +
        (!isActive && 'border-1')
      }
    >
      <summary
        className='text-colours-text-primary cursor-pointer list-none *:float-right'
        onClick={() => setIsActive(!isActive)}
      >
        {question} {isActive ? <ChevronUp /> : <ChevronDown />}
      </summary>
      <p className='mt-2 mr-9 text-[12px] max-sm:text-[10px]'>{answer}</p>
    </details>
  )
}

export default Accordion
