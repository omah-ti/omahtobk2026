'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from './ui/button'

const LogOutDialog = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter()

  const handleLogout = async () => {
    const toastId = toast.loading('Memproses logout...')
    try {
  		const res = await fetch(`${process.env.NEXT_PUBLIC_API_GATEWAY_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Ensure cookies are sent
      })
  
      if (!res.ok) {
        throw new Error('Failed to logout from the backend.')
      }
  
      toast.dismiss(toastId)
      toast.success('Berhasil keluar dari akun.')
      router.push('/')
      router.refresh()
    } catch (error) {
      toast.dismiss(toastId)
      console.error('Logout error: ', error)
      toast.error('Gagal keluar dari akun. Silahkan coba lagi.')
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Apakah anda yakin?
            <AlertDialogCancel
              asChild
              className='my-auto h-auto border-none p-1'
            >
              <X className='text-neutral-500' />
            </AlertDialogCancel>
          </AlertDialogTitle>
          <AlertDialogDescription className='text-justify sm:text-start leading-6'>
            Anda akan keluar dari akun Anda. Semua data sesi akan dihapus dan
            Anda perlu login kembali untuk mengakses fitur-fitur yang memerlukan
            autentikasi. Apakah Anda yakin ingin melanjutkan?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              onClick={handleLogout}
              variant={'destructive'}
              className='text-error-600! hover:bg-error-400! bg-transparent hover:cursor-pointer hover:text-white!'
            >
              Logout
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default LogOutDialog
