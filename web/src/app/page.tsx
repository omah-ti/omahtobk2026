import Navbar from '@/components/home/navbar'
import Hero from '@/modules/home/hero'
import WhyCompsci from '@/modules/home/why-compsci'
import CompsciDivisions from '@/modules/home/compsci-divisions'
import FinalCta from '@/modules/home/final-cta'
import Testimony from '@/modules/home/testimony'
import Inspiration from '@/modules/home/inspiration'
import Statistic from '@/modules/home/statistic'
import Faq from '@/modules/home/faq'
import Footer from '@/modules/home/footer'

export default function Home() {
  return (
    <>
      {/* <Navbar />
      <Hero />
      <WhyCompsci /> */}
      <CompsciDivisions />
      {/* <Statistic />
      <Inspiration />
      <Testimony />
      <SubjectSemester />
      <FinalCta />
      <Faq />
      <UtbkPerspective />
      <SubjectSemester />
      <ReadyPath /> */}
      {/* <Navbar /> */}
      {/* <Hero /> */}
      <WhyCompsci />
      <CompsciDivisions />
      <Statistic />
      <Faq />
      {/* <ReadyPath /> */}
      <Footer />
    </>
  )
}
