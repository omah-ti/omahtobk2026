 
'use client'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { getAuthErrorMessage, resetPasswordAuth } from '@/lib/fetch/auth'
import { zodResolver } from '@hookform/resolvers/zod'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

const formSchema = z
  .object({
    password: z.string().min(8, 'Kata sandi harus minimal 8 karakter.'),
    confirm: z.string().min(8, 'Kata sandi harus minimal 8 karakter.'),
  })
  .refine((data) => data.password === data.confirm, {
    message: 'Kata sandi tidak cocok.',
    path: ['confirm'],
  })

const ResetPasswordPage = () => {
  const router = useRouter()
  const params = useParams<{ token: string | string[] }>()
  const [pending, setPending] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: '', confirm: '' },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const rawToken = params?.token
    const resetToken = Array.isArray(rawToken) ? rawToken[0] : rawToken

    if (!resetToken) {
      toast.error('Gagal mereset password', {
        description: 'Token reset password tidak valid.',
      })
      return
    }

    try {
      setPending(true)

      const response = await resetPasswordAuth({
        reset_token: resetToken,
        new_password: values.password,
      })

      toast.success('Password berhasil direset', {
        description: response.message || 'Silakan login menggunakan password baru.',
      })
      router.push('/login')
    } catch (error: unknown) {
      toast.error('Gagal mereset password', {
        description: getAuthErrorMessage(
          error,
          'Terjadi kesalahan jaringan. Silahkan coba lagi.'
        ),
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className='flex min-h-screen w-full flex-col items-center justify-center'>
      <h1 className='text-2xl font-bold md:mb-6 md:text-4xl'>Lupa Password</h1>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className='flex w-full max-w-lg flex-col gap-4 text-left'
        >
          <FormField
            control={form.control}
            name='password'
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <Input
                    type='password'
                    placeholder='New Password'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='confirm'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm New Password</FormLabel>
                <FormControl>
                  <Input
                    type='password'
                    placeholder='Confirm Password'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type='submit'
            variant='tertiary'
            disabled={pending}
            className='mt-8 w-full max-w-xs items-center self-center'
          >
            {pending ? (
              <>
                <LoaderCircle className='animate-spin' />
                Loading...
              </>
            ) : (
              'Reset Password'
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}

export default ResetPasswordPage
