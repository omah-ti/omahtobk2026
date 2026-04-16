'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
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
import { getAuthErrorMessage, loginAuth } from '@/lib/fetch/auth'
import Link from 'next/link'
import { toast } from 'sonner'

const formSchema = z.object({
  email: z.string().email({
    message: 'Silakan masukkan alamat email yang valid.', // Please enter a valid email address.
  }),
  password: z.string().min(8, {
    message: 'Kata sandi harus minimal 8 karakter.', // Password must be at least 8 characters.
  }),
})

const LoginForm = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const handleLogin = async (values: z.infer<typeof formSchema>) => {
    setLoading(true)
    try {
      await loginAuth(values)

      router.push('/')
      router.refresh()
    } catch (error: unknown) {
      toast.error('Login gagal.', {
        description: getAuthErrorMessage(
          error,
          'Email atau kata sandi tidak valid. Mohon periksa kredensial Anda.'
        ),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleLogin)}
        className='flex w-full flex-col gap-4 text-left'
      >
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input autoFocus placeholder='email@email.com' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className='relative'>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder='Tuliskan Password'
                    {...field}
                  />
                  <button
                    type='button'
                    tabIndex={-1}
                    className='absolute top-1/2 right-3 -translate-y-1/2'
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
              <Link
                href={`/forgot-password`}
                tabIndex={-1}
                className='text-xs font-medium underline underline-offset-2'
              >
                Lupa Password
              </Link>
            </FormItem>
          )}
        />

        <Button
          type='submit'
          disabled={loading}
          className='mt-1 w-full max-w-xs cursor-pointer self-center md:mt-6'
        >
          {loading ? (
            <>
              <LoaderCircle className='animate-spin' />
              Loading...
            </>
          ) : (
            'Masuk'
          )}
        </Button>
      </form>
    </Form>
  )
}

export default LoginForm
