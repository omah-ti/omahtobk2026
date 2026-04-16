import Navbar from '@/components/home/navbar'
import Footer from '@/modules/home/footer'

const CareerMatchUpLayout = async ({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug?: string[] }>
}) => {
  const resolvedParams = await params // Ensure params is resolved
  const pathname = resolvedParams?.slug ? `/${resolvedParams.slug.join('/')}` : '/'

  if (pathname === '/career-match-up/result' || pathname === '/career-match-up/test') {
    return (
      <main className='px-0 md:px-20 lg:px-30'>
        <Navbar />
        {children}
        <Footer />
      </main>
    )
  }

  return (
    <main className=''>
      <Navbar />
      {children}
    </main>
  )
}

export default CareerMatchUpLayout
