import type { Metadata } from 'next'
import './globals.css'
import { lora, plusJakartaSans } from '@/lib/fonts'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'OmahTOBK',
  description:
    'OmahTOBK adalah platform pembelajaran online yang bertujuan untuk membantu calon mahasiswa dalam persiapan seleksi masuk kampus. Mari wujudkan masa depanmu bersama kami!',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en'>
      <body
        className={`${plusJakartaSans.className} ${lora.variable} antialiased overflow-x-hidden`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  )
}
