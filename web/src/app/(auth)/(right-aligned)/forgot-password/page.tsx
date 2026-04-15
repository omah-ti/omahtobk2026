import Link from 'next/link'
import ForgotPasswordForm from './forgot-password-form'

const ForgotPasswordPage = () => {
  return (
    <>
      <h1 className='w-full rounded-lg! text-center text-3xl font-bold md:text-4xl'>
        Lupa password
      </h1>
      <div className='w-full'>
        <ForgotPasswordForm />
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

export default ForgotPasswordPage
