'use client'

import Container from '@/components/container'
import Heading from '@/components/home/heading'
import Image from 'next/image'

type TestimonyType = {
  name: string
  role: string
  image: string
  description: string
}

const TESTIMONIES: TestimonyType[] = [
  {
    name: 'Devid Warner',
    role: 'Founder @xyz company',
    image: '/assets/dummy.webp',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent condimentum dictum euismod malesuada lacus, non consequat quam',
  },
  {
    name: 'Ayasha Rahmadinni',
    role: 'Founder OmahTI',
    image: '/assets/dummy.webp',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent condimentum dictum euismod malesuada lacus, non consequat quam pulvinar eu mauris sit amet, pretium scelerisque eros',
  },
  {
    name: 'Hanna Dokidis',
    role: 'Founder @xyz company',
    image: '/assets/dummy.webp',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent condimentum dictum euismod malesuada lacus, non consequat quam',
  },
  {
    name: 'Gustavo Vaccaro',
    role: 'Founder @xyz company',
    image: '/assets/dummy.webp',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent condimentum dictum euismod malesuada lacus, non consequat quam pulvinar eu mauris sit amet, pretium scelerisque eros',
  },
  {
    name: 'Phillip Bator',
    role: 'Founder @xyz company',
    image: '/assets/dummy.webp',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent condimentum dictum euismod malesuada lacus, non consequat quam',
  },
  {
    name: 'Dulce George',
    role: 'Founder @xyz company',
    image: '/assets/dummy.webp',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent condimentum dictum euismod malesuada lacus, non consequat quam pulvinar eu mauris sit amet, pretium scelerisque eros',
  },
]

export default function Testimony() {
  return (
    <Container className='my-[120px] flex flex-col items-center gap-8'>
      
      <div className='max-w-[622px] flex flex-col gap-[18px]'>
        <Heading className='text-center text-neutral-900 font-bold text-[34px]'>
          Profil Lulusan Berprestasi
        </Heading>
        <p className='max-w-[660px] mx-auto text-center text-neutral-400 text-base leading-6 font-normal'>
          Rekam jejak keberhasilan alumni menembus persaingan global, kini memegang
          peran strategis dan memimpin arus inovasi di berbagai perusahaan teknologi
          bergengsi.
        </p>
      </div>

      <section className='relative grid w-full max-w-[1127px] gap-8 sm:grid-cols-2 lg:grid-cols-3'>
        
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 w-[661px] h-[393px] -translate-x-1/2 -translate-y-1/2">

          {/* kiri*/}
          <div className="absolute left-0 top-[69px] w-[300px] h-[324px] rounded-full bg-primary-400 opacity-40 blur-[90px]" />
          {/* tengah*/}
          <div className="absolute left-1/2 top-[277px] w-[300px] h-[324px] -translate-x-1/2 rounded-full bg-tertiary-500 blur-[90px]" /> 
          {/* kanan */}
          <div className="absolute right-0 top-[69px] w-[300px] h-[324px] rounded-full bg-primary-400 opacity-40 blur-[90px]" />

        </div>

        {TESTIMONIES.map((item, i) => (
          <TestimonyCard key={i} {...item} />
        ))}

      </section>

    </Container>
  )
}

function TestimonyCard({ name, role, image, description }: TestimonyType) {
  return (
    <main className='relative z-10 h-full w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:shadow-md'>
      
      <h2 className='mb-4 flex items-center gap-4'>

        <div className='relative h-[60px] w-[60px] overflow-hidden rounded-full'>
          <Image src={image} alt={name} fill sizes='60px' className='object-cover'/>
        </div>

        <div className='flex flex-col'>
          <h3 className='text-lg font-semibold text-neutral-900'>
            {name}
          </h3>
          <p className='text-sm text-neutral-400'>
            {role}
          </p>
        </div>

      </h2>

      <p className='text-sm leading-relaxed text-neutral-400'>
        {description}
      </p>

    </main>
  )
}