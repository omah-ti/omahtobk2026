import Navbar from '@/components/home/navbar'
import Hero from '@/modules/home/hero'
import WhyCompsci from '@/modules/home/why-compsci'
import SubjectSemester from '@/modules/home/subject-semester'
import Footer from '@/modules/home/footer'
import CompsciDivisions from '@/modules/home/compsci-divisions'
import ReadyPath from '@/modules/home/ready-path'
import UtbkPerspective from '@/modules/home/utbk-perspective'
import Inspiration from '@/modules/home/inspiration'
import Statistic from '@/modules/home/statistic'
import Faq from '@/modules/home/faq'

export default function Home() {
  return (
    <>
      {/* <Navbar />
      <Hero />
      <WhyCompsci /> */}
      <CompsciDivisions />
      {/* <Statistic />
      <Inspiration />
      <Faq />
      <UtbkPerspective />
      <SubjectSemester />
      <ReadyPath /> */}
      {/* <Navbar /> */}
      {/* <Hero /> */}
      <WhyCompsci />
      {/* <CompsciDivisions /> */}
      {/* <Inspiration /> */}
      {/* <UtbkPerspective /> */}
      {/* <SubjectSemester /> */}
      <ReadyPath />
      {/* <TryoutResult /> ini buat ngetes */}
      {/* <Footer /> */}
    </>
  )
}
