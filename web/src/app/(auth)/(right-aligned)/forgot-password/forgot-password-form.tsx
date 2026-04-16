'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

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
import { getAuthErrorMessage, requestPasswordResetAuth } from '@/lib/fetch/auth'
import { LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'

const formSchema = z.object({
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
})

const ForgotPasswordForm = () => {
  const [pending, setPending] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  })

  const handleForgotPassword = async (values: z.infer<typeof formSchema>) => {
    try {
      setPending(true)

      const response = await requestPasswordResetAuth({ email: values.email })

      toast.success('Email berhasil dikirim', {
        description:
          response.message ||
          'Silakan cek email kamu, termasuk folder spam jika belum terlihat.',
      })
    } catch (error: unknown) {
      toast.error('Gagal mengirim email', {
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
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleForgotPassword)}
        className='flex w-full flex-col gap-4 text-left'
      >
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder='email@email.com' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type='submit'
          disabled={pending}
          className='hover:bg-primary-900/75 mt-1 w-full max-w-xs cursor-pointer self-center md:mt-6'
        >
          {pending ? (
            <>
              <LoaderCircle className='animate-spin' />
              Loading...
            </>
          ) : (
            'Kirim Email'
          )}
        </Button>
      </form>
    </Form>
  )
}

export default ForgotPasswordForm
