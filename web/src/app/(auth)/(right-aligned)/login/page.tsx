import LoginForm from './login-form'
import Link from 'next/link'

const LoginPage = () => {
  return (
    <>
      <h1 className='w-full rounded-lg! text-center text-3xl font-bold md:text-4xl'>
        Selamat Datang Kembali!
      </h1>
      <div className='w-full'>
        <LoginForm />
        <p className='text-center text-xs font-bold mt-4'>
          Belum punya akun?{' '}
          <Link
            href={`/register`}
            className='font-light underline underline-offset-2'
          >
            Daftar
          </Link>
        </p>
      </div>
    </>
  )
}

export default LoginPage
