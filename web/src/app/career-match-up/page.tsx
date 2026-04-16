import Link from 'next/link'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { getMbAttempt } from '@/lib/fetch/mb-fetch'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

async function careerMatchUpPage() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value
  const attempt = await getMbAttempt(accessToken, false)
  if (attempt) {
    redirect('/career-match-up/result')
  }

  return (
    <section className='h-screen flex flex-col !px-0 space-y-9 overflow-y-hidden items-center overflow-x-hidden justify-center bg-gradient-to-b relative from-primary-400/30 to-primary-100'>
      <div className='max-w-3xl space-y-2 flex flex-col items-center text-center'>
        <div className="p-[1px] rounded-[100px] bg-gradient-to-r from-[rgba(231,5,24,0.44)] to-[rgba(37,99,235,0.44)] w-fit">
          <div className="rounded-[100px] bg-[#DBE5F9] px-5 py-2 md:text-sm text-xs text-black">
            Roadmap Calon Mahasiswa IT Terbaik
          </div>
        </div>
        <h1 className='italic text-primary-600 md:leading-17 md:text-[48px] text-[28px] font-bold text-center'>
          Role Quest: <span className='font-normal text-neutral-1000'>Cari Tahu </span>DNA IT-mu!
        </h1>
        <p className='text-center text-neutral-1000 md:text-[20px] text-sm'>
          Nggak semua anak Ilkom itu cuma ngoding! Jawab beberapa pertanyaan seru ini untuk mencocokkan kepribadianmu dengan jalur karir masa depan di industri digital
        </p>
      </div>
      <Link href='/career-match-up/test'>
        <Button size='lg' className='px-11 font-bold cursor-pointer'>
          Mulai Quiz
        </Button>
      </Link>
      <Image src='/assets/fullbody-love.webp' alt='Career Match-Up Hero' height={360} width={350} className='rotate-35 h-88 w-auto absolute object-contain xl:scale-130 lg:scale-110 md:scale-100 scale-70 -bottom-30 md:-bottom-20 -left-20 md:-left-10 pointer-events-none' priority />
      <Image src='/assets/fullbody-flipped.webp' alt='Career Match-Up Hero' height={360} width={350} className='rotate-325 h-88 w-auto absolute object-contain xl:scale-130 lg:scale-110 md:scale-100 scale-70 -bottom-20 md:-bottom-10 -right-20 md:-right-10 pointer-events-none' priority />
      
    </section>
  )
}

export default careerMatchUpPage
