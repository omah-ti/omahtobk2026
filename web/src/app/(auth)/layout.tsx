import { fetchUser } from '@/app/fetch_user'
import { redirect } from 'next/navigation'

const AuthLayout = async ({ children }: { children?: React.ReactNode }) => {
  const user = await fetchUser()
  if (user) redirect('/')

  return <main className='bg-primary-200 h-screen min-h-fit'>{children}</main>
}

export default AuthLayout
