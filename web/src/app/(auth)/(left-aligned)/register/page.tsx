import Link from 'next/link'
import RegisterForm from './register-form'

const RegisterPage = () => {
  return (
    <>
      <h1 className='w-full rounded-lg! text-center text-3xl font-bold md:text-left md:text-4xl'>
        Mulai Perjalananmu Sekarang!
      </h1>
      <div className='w-full'>
        <RegisterForm />
        <p className='text-center text-xs font-bold mt-4'>
          Sudah punya akun?{' '}
          <Link
            href={`/login`}
            className='font-light underline underline-offset-2'
          >
            Login
          </Link>
        </p>
      </div>
    </>
  )
}

export default RegisterPage
