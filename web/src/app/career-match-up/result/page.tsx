/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'

import React from 'react'
import { getMbAttempt } from '@/lib/fetch/mb-fetch'
import ResultClient from './ResultClient'
import { cookies } from 'next/headers'
import Enthusiasts from '@/modules/career-match-up/enthusiasts'
import { DIVISIONS } from '@/lib/helpers/divisions'
import Container from '@/components/container'
import Image from 'next/image'
import NavbarResolver from '@/components/home/navbar-resolver'
import Link from 'next/dist/client/link'
import { Button } from '@/components/ui/button'

const UI_ONLY_TEST_MODE = process.env.NEXT_PUBLIC_CMU_UI_ONLY === 'true'

const MOCK_ATTEMPT_DATA = {
  bakat_user: 'dsai',
  dominantCareer: 'dsai',
  careerScores: {
    dsai: 0.87,
    frontend: 0.74,
    backend: 0.69,
    uiux: 0.58,
  },
}

export default async function CareerMatchUpResult() {
  try {
    const attemptData = UI_ONLY_TEST_MODE
      ? MOCK_ATTEMPT_DATA
      : await (async () => {
        const cookieStore = await cookies()
        const accessToken = cookieStore.get('access_token')?.value
        return getMbAttempt(accessToken, false)
      })()

    if (!attemptData) {
      return (
        <div className='flex min-h-screen flex-col items-center justify-center p-4'>
          <div className='max-w-lg text-center'>
            <h2 className='mb-4 text-2xl font-bold'>Belum ada hasil tes</h2>
            <p className='mb-6 text-gray-600'>
              Kamu belum menyelesaikan tes Career Match Up. Silakan ikuti tes
              terlebih dahulu untuk melihat hasil.
            </p>
            <ResultClient action='no-results' />
          </div>
        </div>
      )
    }

    // Extract the dominant career and find its information from DIVISIONS
    const dominantCareer = attemptData.bakat_user || ''
    const careerDivision = DIVISIONS.find(
      (div) => div.slug === dominantCareer.toLowerCase()
    )

    const results = {
      ...attemptData,
      dominantCareerTitle: careerDivision?.name || dominantCareer,
      firstDescription:
        careerDivision?.career.firstDescription ||
        `You show great potential in the ${dominantCareer} field.`,
      secondDescription:
        careerDivision?.career.secondDescription ||
        `Continue exploring opportunities in this area to develop your skills further.`,
    }

    return (
      <>
        <NavbarResolver />
        <Container className='bg-white gap-9'>
          <div className='flex p-0 md:p-10 md:bg-[#e9effd] rounded-[10px] flex-col items-center justify-center gap-8 '>
            <div className='flex flex-col-reverse md:flex-row justify-between items-start gap-8 w-full'>
              <div className='text-center lg:text-left w-full justify-between'>
                <p className='text-base md:text-2xl font-bold'>
                  Role yang cocok untukmu
                </p>
                <h2 className='text-[34px] md:text-[48px] font-bold'>
                  {results.dominantCareerTitle || results.dominantCareer}
                </h2>
              </div>
              <div className='h-auto w-full md:w-[205px] px-10 md:px-0 items-center justify-center overflow-hidden md:mr-15'>
                <Image
                  src={`/assets/divisions/${dominantCareer || 'dsai'}.webp`}
                  alt=''
                  width={205}
                  height={300}
                  className='h-auto w-full object-contain'
                  priority // Tambahkan ini untuk memuat gambar lebih cepat
                />
              </div>
            </div>
            <div className='text-left space-y-3'>
              <p className='text-left md:text-left text-xl font-medium text-gray-700 hidden md:block'>Deskripsi:</p>
              <div className='space-y-7 md:text-base text-xs'>
                <p className='text-justify md:text-left text-gray-600'>
                  {results.firstDescription}
                </p>
                <p className='text-justify md:text-left text-gray-600'>
                  {results.secondDescription}
                </p>
              </div>
            </div>
          </div>

          {/* alumni */}
          <div className='flex p-10 md:bg-[#e9effd] rounded-[10px] flex-col items-center justify-center gap-8'>

          </div>

          {/* cta */}
          <div className='flex p-0 md:p-10 md:bg-[#e9effd] rounded-[10px] flex-row items-center gap-2.5 justify-between'>
            <Image src='/assets/cstryouts.webp' alt='' width={262} height={400} className='w-auto min-w-25 md:w-[262px] h-auto object-contain' />
            <div className='flex flex-col text-center w-full max-w-2xl gap-5 md:gap-10'>
              <div>
                <h2 className='text-neutral-1000 text-base md:text-[34px] font-bold'>Udah Tau Bakat atau Minatmu?</h2>
                <p className='text-neutral-800 text-xs md:text-base'>
                  Saatnya buktikan kemampuanmu di Try-Out OmahTOBK.
                </p>
              </div>
              <Link href='/tryouts'>
                <Button size="lg">
                  Try-Out Sekarang
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </>
    )
  } catch (error) {
    console.error('Error fetching results:', error)
    return (
      <div className='flex min-h-screen flex-col items-center justify-center p-4'>
        <div className='max-w-lg text-center'>
          <h2 className='mb-4 text-2xl font-bold text-red-500'>
            Tidak dapat memuat hasil saat ini
          </h2>
          <p className='mb-6 text-gray-600'>
            Maaf, terjadi kesalahan saat memuat hasil tes kamu. Silakan coba
            lagi nanti.
          </p>
          <ResultClient action='error' />
        </div>
      </div>
    )
  }
}