'use client'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
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
import { LoaderCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const formSchema = z
  .object({
    email: z.string().email({
      message: 'Silakan masukkan alamat email yang valid.', // Please enter a valid email address.
    }),
    nama_user: z.string().min(2, {
      message: 'Nama harus minimal 2 karakter.', // Name must be at least 2 characters.
    }),
    password: z.string().min(8, {
      message: 'Kata sandi harus minimal 8 karakter.', // Password must be at least 8 characters.
    }),
    confirm_password: z.string().min(8, {
      message: 'Kata sandi harus minimal 8 karakter.', // Password must be at least 8 characters.
    }),
    asal_sekolah: z.string().min(3, {
      message: 'Asal Sekolah harus minimal 3 karakter.', // Asal Sekolah must be at least 3 characters.
    }),
  })
  .superRefine(({ confirm_password, password }, ctx) => {
    if (confirm_password !== password) {
      ctx.addIssue({
        code: 'custom',
        message: 'Kata sandi tidak cocok.', // Passwords do not match
        path: ['confirm_password'],
      })
    }
  })

const RegisterForm = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      nama_user: '',
      password: '',
      confirm_password: '',
      asal_sekolah: '',
    },
  })

  const handleLogin = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_GATEWAY_URL}/api/auth/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(values),
        }
      )

      if (!response.ok) {
        toast.error('Gagal membuat akun', {
          description: `${response}`,
        })
        setLoading(false)

        return
      }
      router.push('/login')
    } catch (_error) {
      console.error('Error:', _error)
      toast.error('Gagal membuat akun', {
        description: 'Ups! Terjadi kesalahan jaringan. Silahkan coba lagi.',
      })
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleLogin)}
        className='flex w-full flex-col gap-4 p-4 text-left'
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
          name='nama_user'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama</FormLabel>
              <FormControl>
                <Input placeholder='Tuliskan Nama Lengkap' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='asal_sekolah'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Asal Sekolah</FormLabel>
              <FormControl>
                <Input placeholder='Tuliskan Asal Sekolah' {...field} />
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
                <Input
                  type='password'
                  placeholder='Tuliskan Password'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='confirm_password'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input
                  type='password'
                  placeholder='Tuliskan Ulang Password'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type='submit'
          disabled={loading}
          className='bg-primary-900 hover:bg-primary-900/75 mt-8 w-full max-w-xs cursor-pointer self-center'
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
        <p className='text-center text-xs font-bold'>
          Sudah punya akun?{' '}
          <Link
            href={`/login`}
            className='font-light underline underline-offset-2'
          >
            Login
          </Link>
        </p>
      </form>
    </Form>
  )
}

export default RegisterForm
