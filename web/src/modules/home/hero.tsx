import * as motion from 'motion/react-client'
import Link from 'next/link'

import Container from '@/components/container'
import { Button, buttonVariants } from '@/components/ui/button'
import Image from 'next/image'
import NavbarResolver from '@/components/home/navbar-resolver'

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const childVariants = {
  hidden: { opacity: 0, y: 5 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

const Hero = () => {
  return (
    <main className='bg-gradient-to-b md:relative from-primary-400/30 to-primary-100'>
      <NavbarResolver />
      <Container className='flex flex-col gap-0 pt-8 text-center text-black md:pt-20 md:text-center'>
        <section className='flex flex-col justify-center items-center gap-8 md:mt-4'>
          <motion.div
            variants={containerVariants}
            initial='hidden'
            animate='visible'
            className='z-10 flex w-full max-w-none flex-col gap-2 self-center pt-4 md:max-w-4xl items-center md:gap-6 md:pb-5'
          >
            <motion.div
              variants={childVariants}
              className='text-2xl font-normal text-balance md:text-5xl flex flex-col items-center gap-3'
            >
              <div className="p-[1px] rounded-[100px] bg-gradient-to-r from-[rgba(231,5,24,0.44)] to-[rgba(37,99,235,0.44)] w-fit">
                <div className="rounded-[100px] bg-[#DBE5F9] px-5 py-2 md:text-sm text-xs text-black">
                  Roadmap Calon Mahasiswa IT Terbaik
                </div>
              </div>
              <h1 className='italic text-neutral-1000 md:leading-17'>
                Ubah Keraguanmu <span className='not-italic font-bold text-primary-500'>Jadi Kepastian, Pilih Bidangmu</span>,
                <span className='not-italic font-bold'> Amankan Kursimu.</span>
              </h1>
            </motion.div>
            <motion.p
              variants={childVariants}
              className='max-w-xxl mx-auto mt-2 text-base md:text-[20px] font-medium leading-[24px] md:leading-[30px] text-center text-[#475569] md:mt-4'
            >
              Validasi potensi melalui Analisis Minat, dominasi seleksi dengan Tryout Adaptif. Langkah presisi mengunci kursi Ilmu Komputer 2026.
            </motion.p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 5, zIndex: 10 }}
            animate={{ opacity: 1, y: 0, zIndex: 10, transition: { duration: 0.5 } }}
            className='z-10 flex w-full max-w-none md:flex-row flex-col gap-2 self-center pt-4 md:max-w-4xl justify-center md:gap-6 md:py-0 md:pb-5'
          >
            <Button variant='outline' size='lg' className='w-full md:w-50'>
              <Link href='/career-match-up'>Cari Tech Personamu!</Link>
            </Button>
            <Button variant='default' disabled size='lg' className='w-full md:w-50'>
              <Link href='/dashboard'>Ikuti Try Out Gratis</Link>
            </Button>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 5, zIndex: 10 }}
            animate={{ opacity: 1, y: 0, zIndex: 10, transition: { duration: 0.5 } }}
            className='md:h-101 h-full md:px-0 px-7 md:pb-0 pb-11 flex md:flex-row flex-col gap-5 md:gap-13 justify-center w-full'>
            <Image
              src='/assets/career-match-up.webp'
              alt='Hero Background'
              width={400}
              height={404}
              className='top-0 left-0 w-auto h-full object-cover z-10 aspect-[85/97] rounded-[20px] shadow-[0_10px_20px_0_rgba(0,0,0,0.25)]'
            />
            <Image
              src='/assets/dashboard.webp'
              alt='Hero Background'
              width={1920}
              height={404}
              className='top-0 left-0 w-auto h-full object-cover z-10 aspect-[223/126] rounded-[20px] shadow-[0_10px_20px_0_rgba(0,0,0,0.25)]'
            />
          </motion.div>
        </section>
      </Container>
      <div className='h-38 w-full hidden md:block absolute z-0 md:bottom-0 bg-primary-200' />
    </main>
  )
}

export default Hero
