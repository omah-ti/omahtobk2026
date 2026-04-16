import Navbar from '@/components/home/navbar'
import Hero from '@/modules/home/hero'
import WhyCompsci from '@/modules/home/why-compsci'
import CompsciDivisions from '@/modules/home/compsci-divisions'
import FinalCta from '@/modules/home/final-cta'
import Testimony from '@/modules/home/testimony'
import Statistic from '@/modules/home/statistic'
import Faq from '@/modules/home/faq'
import Footer from '@/modules/home/footer'

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <section id='why-compsci' className='scroll-mt-32'>
        <WhyCompsci />
      </section>
      <section id='compsci-division' className='scroll-mt-32'>
        <CompsciDivisions />
      </section>
      <section id='statistics' className='scroll-mt-32'>
        <Statistic />
      </section>
      <section id='testimony' className='scroll-mt-32'>
        <Testimony />
      </section>
      <section id='faq' className='scroll-mt-32'>
        <Faq />
      </section>
      <FinalCta />
      <Footer />
    </>
  )
}
