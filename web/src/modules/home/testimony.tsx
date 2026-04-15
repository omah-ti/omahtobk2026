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
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent condimentum dictum euismod malesuada lacus, non consequat quam pulvinar eu mauris sit amet, pretium scelerisque eros',
  },
  {
    name: 'Gustavo Vaccaro',
    role: 'Founder @xyz company',
    image: '/assets/dummy.webp',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent condimentum dictum euismod malesuada lacus, non consequat quam',
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
    <Container className='relative my-15 md:my-30 flex flex-col items-center gap-8'>
      
      <div className='max-w-[622px] z-10 flex flex-col gap-1 md:gap-[18px]'>
        <Heading className='text-center text-[20px] md:text-[34px] font-bold'>
          Profil Lulusan Berprestasi
        </Heading>
        <p className='max-w-[660px] mx-auto text-center text-neutral-text text-xs md:text-base'>
          Rekam jejak keberhasilan alumni menembus persaingan global, kini memegang
          peran strategis dan memimpin arus inovasi di berbagai perusahaan teknologi
          bergengsi.
        </p>
      </div>

      <section className='grid w-full px-8 md:px-12 xl:px-30 grid-cols-1 gap-4 lg:grid-cols-3 md:overflow-y-visible overflow-y-scroll md:h-full h-[60vh]'>
        
        <div className="pointer-events-none absolute left-1/2 top-1/3 z-0 w-full h-full -translate-x-1/2 -translate-y-1/2">

          {/* kiri*/}
          <div className="absolute left-1/4 top-100 md:top-1/3 w-50 md:w-[300px] h-[324px] rounded-full bg-primary-400 opacity-60 md:opacity-40 blur-[90px]" />
          {/* tengah*/}
          <div className="absolute left-1/2 top-1/3 md:w-[300px] h-[324px] -translate-x-1/2 rounded-full bg-tertiary-500/40 blur-[90px]" /> 
          {/* kanan */}
          <div className="absolute right-1/4 top-1/3 md:w-[300px] h-[324px] rounded-full bg-primary-400 opacity-40 blur-[90px]" />

        </div>

        <div className='relative z-10 flex flex-col gap-4 md:gap-8'>
          {TESTIMONIES.slice(0, 2).map((item, i) => (
            <TestimonyCard key={`${item.name}-${i}`} {...item} />
          ))}
        </div>

        <div className='relative z-10 flex flex-col gap-4 md:gap-8'>
          {TESTIMONIES.slice(2, 4).map((item, i) => (
            <TestimonyCard key={`${item.name}-${i + 2}`} {...item} />
          ))}
        </div>

        <div className='relative z-10 flex flex-col gap-4 md:gap-8'>
          {TESTIMONIES.slice(4, 6).map((item, i) => (
            <TestimonyCard key={`${item.name}-${i + 4}`} {...item} />
          ))}
        </div>

      </section>

    </Container>
  )
}

function TestimonyCard({ name, role, image, description }: TestimonyType) {
  return (
    <main className='relative z-10 h-fit w-full rounded-2xl border bg-primary-100 p-6 shadow-[0_4px_4px_0_rgba(0,0,0,0.25)] transition-all duration-300'>
      
      <h2 className='mb-4 flex items-center gap-4'>

        <div className='relative h-[60px] w-[60px] overflow-hidden rounded-full'>
          <Image src={image} alt={name} fill sizes='60px' className='object-cover'/>
        </div>

        <div className='flex flex-col'>
          <h3 className='text-lg font-semibold text-neutral-1000'>
            {name}
          </h3>
          <p className='text-sm text-neutral-text'>
            {role}
          </p>
        </div>

      </h2>

      <p className='text-sm leading-relaxed text-neutral-text'>
        {description}
      </p>

    </main>
  )
}