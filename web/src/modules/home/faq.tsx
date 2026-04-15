import React from 'react'
import Container from '@/components/container'
import Accordion from '@/components/home/FAQAccordion'

// colors-text-primary | secondary added
// PURE WHITE -> neutral-25

const faq = () => {
  return (
    <section className='from-primary-200 to-primary-500 bg-gradient-to-r from-0% to-[134%] w-full'>
      <Container className='py-15 md:py-30'>
        <div className='flex px-8 md:px-12 xl:px-30 gap-6 *:w-1/2 max-sm:flex-col max-sm:text-[12px] max-sm:*:w-full'>
          <section className='text-colours-text-primary max-sm:text-center'>
            <h4 className='text-[34px] font-bold max-sm:text-[22px] text-primary-text'>
              Pertanyaan Sering Diajukan
            </h4>
            <p className='text-primary-text'>
              Yuk, cari tahu seputar Ilmu Komputer Universitas Gadjah Mada
            </p>
          </section>
          <section className='flex flex-col gap-4'>
            <Accordion />
            <Accordion />
            <Accordion question='Kapan OTI Open Recruitment?' />
            <Accordion />
            <Accordion />
          </section>
        </div>
      </Container>
    </section>
  )
}

export default faq
