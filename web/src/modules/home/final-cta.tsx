import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { fetchUser } from '@/app/fetch_user'
import { User } from '@/lib/types/types'

const ReadyPath = async () => {
  const user: User = await fetchUser()

  return (
    <section className='relative bg-white py-[140px] overflow-hidden'>
      <div className='absolute inset-0 z-0 pointer-events-none'>
        <Image src='/assets/Capa 1.webp' alt='Background' fill className='object-contain object-center' priority/>
      </div>

      <div className='relative z-10 mx-auto flex max-w-[1700px] items-center justify-center px-6 lg:px-8'>
        <div className='relative w-[400px] h-[443px] shrink-0'>
          <Image src='/assets/fullbody_2.webp' alt='Robot' fill className='object-contain' sizes='681px' priority/>
        </div>

        <div className='w-[720px] text-center'>
          {user ? (
            <></>
          ) : (
            <>
              <h2 className='text-[48px] leading-[50px] font-normal text-slate-900'>
                Masih{' '} <span className='font-medium italic'> Ragu </span>{' '} Pilih Jurusan IT?
              </h2>

              <p className='mt-[14px] text-[20px] leading-[30px] font-medium text-[#475569]'>
                Nggak perlu bingung! Temukan kecocokan potensimu lewat Kuis
                Interaktif, lalu buktikan kemampuan belajarmu di Try-Out
                OmahTOBK.
              </p>

              <Link href='/register' className='mt-4 inline-block'>
                <Button variant='tertiary' size='lg' className='w-[200px] h-[44px]'>
                  Daftar Sekarang
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

export default ReadyPath