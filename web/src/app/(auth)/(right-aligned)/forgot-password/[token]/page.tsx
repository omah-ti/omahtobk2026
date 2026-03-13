/* eslint-disable @typescript-eslint/no-explicit-any */
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
  const { token } = useParams()
  const [pending, setPending] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: '', confirm: '' },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setPending(true)
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_GATEWAY_URL}/api/auth/reset-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reset_token: token,
            new_password: values.password,
          }),
        }
      )
      const data = await res.json()

      if (!res.ok) {
        toast.error('Gagal mereset password', {
          description: `${data.error}`,
        })
        return
      }

      toast.success('Password berhasil direset', {
        description: `${data.message}`,
      })
      router.push('/login')
    } catch (error: unknown) {
      console.error('Error:', error)
      toast.error('Gagal mereset password', {
        description: `${error instanceof Error ? error.message : 'Terjadi kesalahan jaringan. Silahkan coba lagi.'}`,
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
