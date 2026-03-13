import Container from '@/components/container'
import RemainingTime from '@/components/tryout/remaining-time'
import TopBar from '@/components/tryout/top-bar'
import { syncTryout } from '@/lib/fetch/tryout-test'
import { cn } from '@/lib/utils'
import { cookies } from 'next/headers'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { buttonVariants } from '../ui/button'
import * as motion from 'motion/react-client'
import { SUBTESTS } from '@/lib/helpers/subtests'
import { toast } from 'sonner'

const IntroPage = async () => {
  const accessToken = (await cookies()).get('access_token')?.value as string
  const res = await fetch(`${process.env.API_GATEWAY_URL}/api/tryout/sync/current`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `access_token=${accessToken}`,
    },
  })

  let timeLimit
  try {
    const syncData = await syncTryout([], accessToken)
    timeLimit = syncData.data.time_limit
  } catch (error) {
    console.error('Error:', error)
    toast.error('Gagal mensinkronisasi Tryout', {
      description:
        'Sepertinya terdapat masalah jaringan atau anda tidak mengumpulkan jawaban subtes. Silahkan ulang Tryout.',
      position: 'bottom-left',
    })
    redirect('/tryout')
  }

  const grace = 30_000
  const adjustedTimeLimit = new Date(new Date(timeLimit).getTime() - grace)

  if (!res.ok) {
    toast.error('Gagal Mengerjakan Tryout', {
      description: `Error backend`,
    })
    redirect('/tryout')
  }

  const currentTryout = await res.json()
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
            href='/tryout/1'
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
