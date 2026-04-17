import { User as UserIcon } from 'lucide-react'
import { User } from '@/lib/types/types'

type ProfileCardProps = {
  user: User
}

const ProfileCard = ({ user }: ProfileCardProps) => {
  return (
    <div className='bg-white rounded-2xl border border-neutral-100 p-5 flex items-center gap-4'>
      <div className='w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center shrink-0'>
        <UserIcon size={24} className='text-primary-400' />
      </div>
      <div className='flex flex-col gap-[3px]'>
        <p className='text-xs text-neutral-400 font-normal'>Profil Kamu</p>
        <p className='text-base font-bold text-neutral-900'>
          {user?.username ?? '–'}
        </p>
        <p className='text-sm text-neutral-500'>
          {user?.asal_sekolah ?? '–'}
        </p>
      </div>
    </div>
  )
}

export default ProfileCard
