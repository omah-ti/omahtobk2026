import Container from '@/components/container'
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

  if (pathname === '/career-match-up/result') {
    return (
      <main>
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
