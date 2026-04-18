import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { fetchUser } from '@/app/fetch_user'
import { User } from '@/lib/types/types'
import { cn } from '@/lib/utils'
import { Menu } from 'lucide-react'
import Link from 'next/link'
import Container from '../container'
import { Button, buttonVariants } from '../ui/button'
import Logo from './logo'
import ProfileButton from './profile-button'
import LogOutDialog from '../log-out-dialog'

const NAV_ITEMS = [
  {
    name: 'Impact',
    href: '/#why-compsci',
  },
  {
    name: 'Spesialisasi',
    href: '/#compsci-division',
  },
  {
    name: 'Prospek',
    href: '/#statistics',
  },
  {
    name: 'Alumni',
    href: '/#testimony',
  },
  {
    name: 'FAQs',
    href: '/#faq',
  },
]

const Navbar = async () => {
  const user = await fetchUser()
  const isSignedIn = user !== null

  return (
    <>
      <main className='md:mt-6 md:mx-auto xl:mx-auto max-w-7xl fixed inset-x-0 top-0 z-50 border-b-2 shadow-[0_4px_9px_0_rgba(18,72,193,0.90)] bg-white rounded-b-[20px] md:rounded-[40px]'>
        <Container className='h-20 flex-row items-center w-full justify-between gap-8'>

          <DesktopNavigation signedIn={isSignedIn} user={user} />
          <MobileNavigation signedIn={isSignedIn} user={user} />
        </Container>
      </main>

    </>
  )
}

const DesktopNavigation = ({
  signedIn = false,
  user,
}: {
  signedIn: boolean
  user?: User
}) => (
  <main className='hidden gap-8 md:flex justify-between w-full'>
    <Logo />

    <div className='flex justify-between gap-10'>
      {NAV_ITEMS.map((nav, i) => (
        <Link href={nav.href} key={i}>
          <Button variant={`link`} className='px-0 font-normal'>
            {nav.name}
          </Button>
        </Link>
      ))}
    </div>

    <div className='flex justify-between gap-2'>
      {signedIn ? (
        <ProfileButton />
      ) : (
        <>
          <Link href={`/login`}>
            <Button variant="outline" className='px-8 hover:cursor-pointer'>
              Login Try Out
            </Button>
          </Link>
          <Link href={`/register`}>
            <Button className='px-8 hover:cursor-pointer'>
              Daftar Try Out
            </Button>
          </Link>
        </>
      )}
    </div>
  </main>
)

const MobileNavigation = ({
  signedIn = false,
}: {
  signedIn: boolean
  user?: User
}) => (
  <main className='flex md:hidden justify-between w-full'>
    <Sheet>
      <Logo />
      <SheetTrigger asChild>
        <Button variant={`ghost`}>
          <Menu className='text-primary' />
        </Button>
      </SheetTrigger>
      <SheetContent className='flex flex-col items-start justify-between pt-[15vh] pb-[10vh] *:text-start'>
        <SheetHeader>
          <SheetTitle className='sr-only'>Sidebar</SheetTitle>
          <SheetDescription className='sr-only'>
            Description for sidebar
          </SheetDescription>
        </SheetHeader>
        <main className='flex h-full w-full flex-col justify-between gap-8 text-lg font-semibold text-black'>
          <section className='flex flex-col gap-2'>
            {NAV_ITEMS.map((nav, i) => (
              <Link key={i} href={nav.href}>
                <SheetClose>{nav.name}</SheetClose>
              </Link>
            ))}
          </section>
          <section className='flex flex-col gap-2'>
            {signedIn ? (
              <LogOutDialog>
                <button
                  className={cn(
                    buttonVariants({ variant: 'destructive' }),
                    'bg-error-400 text-red-700 hover:bg-error-400 hover:cursor-pointer hover:text-red-400 focus:ring-red-400 focus:ring-offset-red-100 disabled:pointer-events-none data-[state=open]:bg-transparent'
                  )}
                >
                  Logout
                </button>
              </LogOutDialog>
            ) : (
              <>
                <SheetClose asChild>
                  <Button variant='outline' size='lg' className='w-full'>
                    <Link
                    href='/login'
                  >
                    Login Try Out
                  </Link>
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button variant='default' size='lg' className='w-full'>
                    <Link
                      href='/register'
                    >
                      Daftar Try Out
                    </Link>
                  </Button>
                </SheetClose>
              </>
            )}
          </section>
        </main>
      </SheetContent>
    </Sheet>
  </main>
)

export default Navbar
