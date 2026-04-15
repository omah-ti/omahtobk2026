import BackLink from '@/components/back-link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Image from 'next/image'

const AuthRightAlignedLayout = ({
  children,
}: {
  children: React.ReactNode
}) => {
  return (
    <main className='grid h-full grid-cols-1 md:grid-cols-2'>
      <section className='flex items-end justify-center overflow-clip'>
        <Image
          src={`/assets/Fullbody 2new.webp`}
          alt='Robot'
          width={530}
          height={660}
          className='z-0 aspect-4/5 translate-y-14 max-md:w-7/10 max-md:translate-y-18'
        />
      </section>
      <section className='z-10 flex flex-col items-center gap-10 rounded-t-2xl bg-white p-8 text-center md:overflow-y-auto md:rounded-tl-none md:rounded-r-2xl md:p-14'>
        <BackLink className='mx-auto flex w-full'>
          <Button className='border-primary-900 bg-primary-900 hover:bg-primary-new-25 cursor-pointer items-center border-1 max-sm:text-sm'>
            <ArrowLeft className='size-4' /> Kembali
          </Button>
        </BackLink>
        {children}
      </section>
    </main>
  )
}

export default AuthRightAlignedLayout
