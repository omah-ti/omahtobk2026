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
import { getAuthErrorMessage, logoutAuth } from '@/lib/fetch/auth'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from './ui/button'
import { useState } from 'react'

const LogOutDialog = ({ children }: { children: React.ReactNode }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (isLoggingOut) {
      return
    }

    setIsLoggingOut(true)
    const toastId = toast.loading('Memproses logout...')

    try {
      await logoutAuth()

      toast.dismiss(toastId)
      toast.success('Berhasil keluar dari akun.')

      // Force hard navigation so protected pages are left immediately
      // after cookies are cleared by the logout endpoint.
      window.location.replace('/login')
    } catch (error: unknown) {
      toast.dismiss(toastId)
      toast.error('Gagal keluar dari akun.', {
        description: getAuthErrorMessage(
          error,
          'Silahkan coba lagi beberapa saat lagi.'
        ),
      })
      setIsLoggingOut(false)
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
              disabled={isLoggingOut}
              variant={'destructive'}
              className='text-red-700 hover:bg-error-400 bg-transparent hover:cursor-pointer hover:text-red-400 focus:ring-red-400 focus:ring-offset-red-100 disabled:pointer-events-none data-[state=open]:bg-transparent'
            >
              {isLoggingOut ? 'Memproses...' : 'Logout'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default LogOutDialog
