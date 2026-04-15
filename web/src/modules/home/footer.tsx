import Container from '@/components/container'
import Logo from '@/components/home/logo'
import { Instagram, Link2, Mail, Phone } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'

const CONTACTS = [
  {
    icon: <Phone strokeWidth={2} className='size-5' />,
    text: '(+62) 899-0221-068',
  },
  {
    icon: <Mail strokeWidth={2} className='size-5' />,
    text: 'omahti.mipa@ugm.ac.id',
  },
  {
    icon: <Instagram strokeWidth={2} className='size-5' />,
    text: '@omahti_ugm',
  },
]

const Footer = () => {
  return (
    <main className='bg-primary-200'>
      <Container className='py-8'>
        <section className='grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-8'>
          <InfoSection />
          <ContactSection />
        </section>
        <div className='mt-4 flex h-16 w-full items-center justify-center bg-white'>
          <HoverCard>
            <HoverCardTrigger asChild>
              <Link
                href='https://omahti.web.id'
                target='_blank'
                rel='noopener noreferrer'
              >
                <Image
                  src='/assets/omahti.png'
                  alt='OmahTI Logo'
                  width={83}
                  height={28}
                  sizes='100%'
                  className='mx-auto h-[28px] w-[83px]'
                />
              </Link>
            </HoverCardTrigger>
            <HoverCardContent className='flex gap-3 w-80 text-sm'>
              <Link2 />
              <div className='space-y-1'>
                <h4 className='font-semibold underline'>
                  OmahTI (Organisasi Mahasiswa Ahli Teknologi Informasi)
                </h4>
                <p>An IT organization based in Gadjah Mada University.</p>
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>
      </Container>
    </main>
  )
}

const InfoSection = () => {
  return (
    <main className='flex flex-col gap-4 font-semibold'>
      {/* title + image */}
      <Logo />

      {/* body text */}
      <div className='space-y-4 text-sm text-balance'>
        <p>
          OmahTI - Organisasi Mahasiswa Ahli Teknologi Informasi. Berkomitmen membantu calon mahasiswa dalam persiapan seleksi masuk kampus. Mari wujudkan masa depanmu bersama kami!
        </p>

        <p>@ 2026 OmahTI UGM</p>
      </div>
    </main>
  )
}

const ContactSection = () => {
  return (
    <main className='flex flex-col gap-4 text-sm font-semibold text-balance md:col-start-3'>
      <p className='text-balance'>
        Gedung Fakultas MIPA UGM Sekip Utara,Bulaksumur, Sinduadi, Mlati,
        Sleman, DI Yogyakarta
      </p>

      {CONTACTS.map((contact, i) => (
        <div key={i} className='flex items-center gap-3'>
          {contact.icon}
          <p>{contact.text}</p>
        </div>
      ))}
    </main>
  )
}

export default Footer
