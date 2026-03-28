import Container from '@/components/container'
import WhyCompsciCard from '@/components/home/why-compsci-card'
import { div } from 'motion/react-client'
import React from 'react'

const WhyCompsci = () => {
  return (
    <div className='bg-primary-200 py-30'>
      <Container className='flex flex-col items-center'>
        <h2 className='mb-8 max-w-[660px] text-center text-[20px] md:text-[34px] font-bold'>Dunia Bergerak dengan Kode. Kenapa Kamu Harus Ada di Sana?</h2>
        <div className='flex gap-6 md:flex-row flex-col'>
          <WhyCompsciCard icon="brain" title="Logika Tanpa Batas" description="Bangun sistem digital cerdas dengan keahlian problem solving yang tajam." />
          <WhyCompsciCard icon="web" title="Efek Eksponen" description="Ciptakan dampak global melalui aplikasi yang menjadi solusi jutaan orang." />
          <WhyCompsciCard icon="time" title="Industri Kekal Waktu" description="Amankan masa depan dengan karier IT yang tetap relevan di setiap zaman." />
          <WhyCompsciCard icon="key" title="Fleksebilitas" description="Jadikan skill coding sebagai paspor digital untuk bekerja dari mana saja." />
        </div>
      </Container>
    </div>
  )
}

export default WhyCompsci
