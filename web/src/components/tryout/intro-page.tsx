import Container from '@/components/container'
import RemainingTime from '@/components/tryout/remaining-time'
import TopBar from '@/components/tryout/top-bar'
import {
  getCurrentTryout,
  startSubtest,
  startTryout,
} from '@/lib/fetch/tryout-test'
import { getRequestAccessToken } from '@/lib/auth/request-token'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { buttonVariants } from '../ui/button'
import * as motion from 'motion/react-client'
import { SUBTESTS } from '@/lib/helpers/subtests'

const IntroPage = async () => {
  const accessToken = await getRequestAccessToken()
  let currentTryout = await getCurrentTryout(accessToken)

  // Initialize paket1 attempt on first entry if there is no ongoing attempt.
  if (!currentTryout?.data?.subtest_sekarang) {
    try {
      await startTryout(accessToken)
      currentTryout = await getCurrentTryout(accessToken)
    } catch (error) {
      console.error('Error starting attempt:', error)
      redirect('/dashboard-home?error=start-attempt-failed')
    }
  }

  if (!currentTryout?.data?.subtest_sekarang) {
    redirect('/dashboard-home?error=current-attempt-failed')
  }

  let timeLimit
  try {
    const subtestStart = await startSubtest(
      currentTryout.data.subtest_sekarang,
      accessToken
    )
    timeLimit = subtestStart.data.time_limit
  } catch (error) {
    console.error('Error:', error)
    redirect('/dashboard-home?error=start-subtest-failed')
  }

  const grace = 30_000
  const adjustedTimeLimit = new Date(new Date(timeLimit).getTime() - grace)

  const subtestKey = currentTryout.data.subtest_sekarang || 'subtest_pu' // Default to 'subtest_pu'

  const { title, index, src, description } = SUBTESTS[subtestKey] || {
    title: 'Subtest Tidak Diketahui',
    index: 0,
    img: '/placeholder.png',
    description: 'Tidak ada informasi subtest tersedia.',
  }

  return (
    <main className='relative h-screen'>
      <Container className='z-10 h-full justify-between *:z-10'>
        <section className='flex flex-col gap-4'>
          <TopBar variant='ghost' />
          <RemainingTime time={adjustedTimeLimit} className='md:px-6 md:py-3' />
        </section>

        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'tween', duration: 0.2 }}
          className='mt-auto mb-[10vh] flex w-full max-w-(--breakpoint-md) flex-col gap-4 *:font-bold *:text-white'
        >
          <h3 className='text-sm md:text-base'>Subtest {index}</h3>
          <h1 className='text-4xl font-bold md:text-5xl'>{title}</h1>
          <h2 className='text-sm md:text-base'>{description}</h2>

          <Link
            href='/tryout/soal/1'
            className={cn(
              buttonVariants({ variant: 'white' }),
              'mt-2 w-fit px-8 font-medium! text-black!'
            )}
          >
            Kerjakan Subtest
          </Link>
        </motion.section>
      </Container>

      {/* image + overlay */}
      <Image
        src={`/assets/subtests/${src}.webp`}
        alt={title}
        fill
        sizes='90%'
        className='z-0 object-cover'
      />
      <div className='bg-primary-new-300/50 absolute inset-0 z-0' />
    </main>
  )
}

export default IntroPage
