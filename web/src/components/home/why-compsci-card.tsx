import { Brain, Globe, History, LockKeyholeOpen } from 'lucide-react'
import React from 'react'
type Props = {
  icon: string
  title: string
  description: string
}
const WhyCompsciCard = ({ icon, title, description }: Props) => {
  return (
    <div className='rounded-[15px] bg-neutral-100 p-4 shadow-[0_4px_4px_rgba(0,0,0,0.25)]'>
      <div className='flex md:flex-col items-center md:items-baseline gap-3 md:gap-[32px] mb-2 md:mb-0'>
        {icon === 'brain' && (
          <Brain className='h-[28px] w-[28px] md:h-[50px] md:w-[50px]' />
        )}
        {icon === 'web' && (
          <Globe className='h-[28px] w-[28px] md:h-[50px] md:w-[50px]' />
        )}
        {icon === 'time' && (
          <History className='h-[28px] w-[28px] md:h-[50px] md:w-[50px]' />
        )}
        {icon === 'key' && (
          <LockKeyholeOpen className='h-[28px] w-[28px] md:h-[50px] md:w-[50px]' />
        )}

        <h3 className='text-[16px] font-bold md:text-[20px]'>{title}</h3>
      </div>
      <p className='text-[16px]'>{description}</p>
    </div>
  )
}

export default WhyCompsciCard
