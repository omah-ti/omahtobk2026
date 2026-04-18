export const dynamic = 'force-dynamic'

import { getMbAttempt, getMbLatestResult } from '@/lib/fetch/mb-fetch'
import ResultClient from './ResultClient'
import { cookies } from 'next/headers'
import { resolveCareerProfile } from '@/modules/career-match-up/career-profiles'
import Container from '@/components/container'
import Image from 'next/image'
import NavbarResolver from '@/components/home/navbar-resolver'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import AlumniCarousel from './alumni-carousel'
import Footer from '@/modules/home/footer'
import { ALUMNI } from '@/lib/helpers/alumni'

export default async function CareerMatchUpResult() {
  try {
    const { attemptData, latestResult } = await (async () => {
      const cookieStore = await cookies()
      const accessToken = cookieStore.get('access_token')?.value
      const guestId = cookieStore.get('mb_guest_id')?.value
      const [attempt, result] = await Promise.all([
        getMbAttempt(accessToken, false, undefined, guestId),
        getMbLatestResult(accessToken, false, undefined, guestId),
      ])

      return {
        attemptData: attempt,
        latestResult: result,
      }
    })()

    if (!attemptData && !latestResult) {
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

    const rawRoleName = latestResult?.dna_it_top || attemptData?.bakat_user || ''
    const profile = resolveCareerProfile(rawRoleName)
    const dominantCareerTitle = profile?.title || rawRoleName || 'Role belum tersedia'
    const firstDescription =
      profile?.firstDescription ||
      `Kamu menunjukkan potensi kuat pada jalur ${dominantCareerTitle}.`
    const secondDescription =
      profile?.secondDescription ||
      'Terus eksplorasi role ini dan asah kemampuanmu melalui proyek nyata.'
    const imageSlug = profile?.imageSlug || attemptData?.bakat_user || 'dsai'
    const normalizedDivision = imageSlug.toLowerCase() as
      | 'frontend'
      | 'backend'
      | 'uiux'
      | 'mobapps'
      | 'cysec'
      | 'dsai'
      | 'gamedev'
    const matchedAlumni = ALUMNI.filter(
      (alumni) => alumni.division === normalizedDivision
    )

    const results = {
      dominantCareerTitle,
      firstDescription,
      secondDescription,
    }

    return (
      <>
        <NavbarResolver />
        <Container className='bg-white gap-9 mb-14 px-0 md:px-20 lg:px-30'>
          <div className='flex p-4 md:p-10 md:bg-[#e9effd] rounded-[10px] flex-col items-center justify-center gap-8 '>
            <div className='flex flex-col-reverse md:flex-row justify-between items-start gap-8 w-full'>
              <div className='text-center lg:text-left w-full justify-between'>
                <p className='text-base md:text-2xl font-bold'>
                  Role yang cocok untukmu
                </p>
                <h2 className='text-[34px] md:text-[48px] font-bold'>
                  {results.dominantCareerTitle}
                </h2>
              </div>
              <div className='h-auto w-full md:w-[205px] px-10 md:px-0 items-center justify-center overflow-hidden md:mr-15'>
                <Image
                  src={`/assets/divisions/${imageSlug}.webp`}
                  alt=''
                  width={205}
                  height={300}
                  className='h-auto w-full object-contain'
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
          <div className='flex px-0 md:px-10 pb-18 pt-14 md:pb-7 bg-[#e9effd] mx-0 rounded-[10px] flex-col items-center justify-center gap-8'>
            <div className='flex flex-col text-center'>
              <h3 className='text-xl md:text-[34px] font-bold'>Alumni yang Sesuai Rolemu</h3>
              <p className='text-center text-neutral-1000 text-xs md:text-base'>
                Gambaran Karir Alumni Sesuai dengan minat bakatmu
              </p>
            </div>
            {matchedAlumni.length > 0 ? (
              <AlumniCarousel items={matchedAlumni} />
            ) : (
              <p className='text-center text-sm md:text-base text-neutral-900'>
                belum ada alumni terdata untuk divisi ini
              </p>
            )}
          </div>

          {/* cta */}
          <div className='flex p-4 md:p-10 md:bg-[#e9effd] rounded-[10px] flex-row items-center gap-2.5 justify-between'>
            <Image src='/assets/cstryouts.webp' alt='' width={262} height={400} className='w-auto min-w-25 md:w-[262px] h-auto object-contain' />
            <div className='flex flex-col text-center w-full max-w-2xl gap-5 md:gap-10'>
              <div>
                <h2 className='text-neutral-1000 text-base md:text-[34px] font-bold'>Udah Tau Bakat atau Minatmu?</h2>
                <p className='text-neutral-800 text-xs md:text-base'>
                  Saatnya buktikan kemampuanmu di Try-Out OmahTOBK.
                </p>
              </div>
              {/* <Link href='/'> */}
              <Button size="lg" disabled className='w-fit cursor-not-allowed self-center'>
                Try-Out Sekarang
              </Button>
              {/* </Link> */}
            </div>
          </div>
        </Container>
        <Footer />
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