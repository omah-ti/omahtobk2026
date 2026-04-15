import Link from 'next/link'
import Container from '@/components/container'
import Footer from '@/modules/home/footer'
import { ArrowLeft } from 'lucide-react'
import Image from 'next/image'

const NotFound = () => {
  return (
    <>
      <main className='flex min-h-screen items-center justify-center bg-white py-10'>
        <Container>
          <div className='flex w-full flex-col items-center gap-10 md:flex-row md:items-center md:justify-center md:gap-10'>
            <div className='flex justify-center md:w-[180px]'>
              <Image
                src='/assets/fullbody_sad.webp'
                alt='404 Not Found'
                width={180}
                height={180}
                className='h-auto w-full max-w-[160px] object-contain md:max-w-[180px]'
                priority
              />
            </div>

            <div className='flex w-full flex-col items-center gap-5 text-center md:w-[520px] md:items-start md:text-left md:gap-6'>
              <h1
                className='text-6xl font-bold text-[#0D3388] md:text-8xl'
                style={{
                  textShadow:
                    '0 4px 4px rgba(0, 0, 0, 0.25)',
                }}
              >
                404
              </h1>

              <p className='max-w-xl text-center text-lg text-neutral-700 md:text-left md:text-2xl'>
                Maafkan kami, <span className='font-bold'>masalah atau eror terjadi dalam tryout</span>, kamu dapat kembali ke halaman dashboard.
              </p>

              <Link href='/' className='inline-flex'>
                <div className='flex items-center gap-2 rounded-[8px] bg-[#0D3388] px-[18px] py-3 font-bold text-white'>
                  <ArrowLeft size={16} />
                  Kembali
                </div>
              </Link>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  )
}

export default NotFound
