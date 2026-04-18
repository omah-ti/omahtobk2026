import { User as UserIcon } from 'lucide-react'
import { User } from '@/lib/types/types'

type ProfileCardProps = {
  user: User
}

const ProfileCard = ({ user }: ProfileCardProps) => {
  return (
    <div className='bg-white w-full rounded-xl border border-neutral-100 p-5 flex items-center gap-4 shadow-[0_2px_4px_0_rgba(0,0,0,0.08),0_3px_10px_0_rgba(0,0,0,0.10)]'>
      <div className='size-6 md:size-20 rounded-full bg-primary-50 flex items-center justify-center shrink-0'>
        <UserIcon size={24} className='md:size-20 text-primary-400' />
      </div>
      <div className='flex flex-col text-neutral-1000'>
        <p className='text-xs font-normal'>Profil Kamu</p>
        <p className='text-2xl font-bold'>
          {user?.username ?? '–'}
        </p>
        <p className='text-sm'>
          {user?.asal_sekolah ?? '–'}
        </p>
      </div>
    </div>
  )
}

export default ProfileCard
