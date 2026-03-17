import Navbar from '@/components/home/navbar'
import Hero from '@/modules/home/hero'
import WhyCompsci from '@/modules/home/why-compsci'
import SubjectSemester from '@/modules/home/subject-semester'
import Footer from '@/modules/home/footer'
import CompsciDivisions from '@/modules/home/compsci-divisions'
import FinalCta from '@/modules/home/final-cta'
import Testimony from '@/modules/home/testimony'
import Inspiration from '@/modules/home/inspiration'

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <WhyCompsci />
      <CompsciDivisions />
      <Inspiration />
      <Testimony />
      <SubjectSemester />
      <FinalCta />
      {/* <TryoutResult /> ini buat ngetes */}
      <Footer />
    </>
  )
}
