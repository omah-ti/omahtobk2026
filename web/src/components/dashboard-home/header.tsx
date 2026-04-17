import LogOutDialog from '@/components/log-out-dialog'
import { Button } from '@/components/ui/button'
import { User } from '@/lib/types/types'
import { LogOut } from 'lucide-react'

type DashboardHeaderProps = {
  user: User
  hasOngoingTryout?: boolean
}

const DashboardHeader = ({ user, hasOngoingTryout = false }: DashboardHeaderProps) => {
  return (
    <header className='flex items-center justify-between'>
      <div className='flex flex-col gap-[3px]'>
        <h1 className='text-2xl font-bold text-neutral-900'>
          Selamat datang, {user?.username ?? 'Peserta'}!
        </h1>
        <p className='text-base font-normal leading-6 text-neutral-900'>
          {hasOngoingTryout
            ? 'Kamu masih ada Try Out yang belum selesai.'
            : 'Mulai persiapkan dirimu untuk UTBK hari ini.'}
        </p>
      </div>

      <LogOutDialog>
        <Button
          variant='outline'
          className='h-auto gap-2 rounded-lg border border-red-300 px-4 py-2.5 text-sm font-medium text-error-600 shadow-xs hover:bg-red-50 hover:text-error-600'
        >
          <LogOut className='h-4 w-4' />
          Log Out
        </Button>
      </LogOutDialog>
    </header>
  )
}

export default DashboardHeader
