import React from 'react'
import Container from '@/components/container'
import Accordion from '@/components/home/FAQAccordion'

// colors-text-primary | secondary added
// PURE WHITE -> neutral-25

const faq = () => {
  return (
    <section className='from-primary-200 to-primary-500 bg-gradient-to-r from-0% to-[134%] w-full'>
      <Container className='py-15 md:py-30'>
        <div className='flex px-8 md:px-12 xl:px-30 gap-6 *:w-1/2 max-sm:flex-col max-sm:text-[12px] max-sm:*:w-full'>
          <section className='text-colours-text-primary max-sm:text-center'>
            <h4 className='text-[34px] font-bold max-sm:text-[22px] text-primary-text'>
              Pertanyaan Sering Diajukan
            </h4>
            <p className='text-primary-text'>
              Yuk, cari tahu seputar Ilmu Komputer Universitas Gadjah Mada
            </p>
          </section>
          <section className='flex flex-col gap-4'>
            <Accordion question='Sistem penilaian Try Out Omah TOBK pakai apa?' answer='Kami menggunakan sistem penilaian IRT (Item Response Theory) yang standar perhitungannya sama persis dengan UTBK nasional. Jadi, skor yang kamu dapatkan sangat akurat untuk simulasi!' />
            <Accordion question='Apakah soal Try Out bisa dikerjakan berulang kali ?' answer='Untuk menjaga keakuratan simulasi mental saat UTBK, Try Out hanya bisa dikerjakan 1 kali dalam sekali sesi ujian.Namun, kamu bisa me - review hasil dan pembahasannya setelah ujian selesai di halaman Dashboard.' />
            <Accordion question='Apakah nilai Try Out di Omah TOBK bisa memprediksi peluang lolosku ?' answer='Tentu bisa! Sistem kami dilengkapi fitur Analisis Target. Setelah ujian selesai, nilaimu akan langsung dibandingkan dengan perkiraan passing grade jurusan impianmu (termasuk Ilmu Komputer UGM), jadi kamu tahu harus ngejar berapa poin lagi.' />
            <Accordion question='Apa bedanya Ilmu Komputer (Ilkomp) dan Teknologi Informasi (TI) di UGM ?' answer='Sering banget ketukar, nih! Ilkomp (Fakultas MIPA) lebih fokus pada teori komputasi, pengembangan software, dan algoritma. Sedangkan TI (Fakultas Teknik lebih fokus ke perancangan sistem, hardware, dan rekayasa komputer.' />
            <Accordion question='Mata pelajaran SMA apa yang paling relevan dengan perkuliahan Ilmu Komputer UGM ?' answer='Matematika adalah fondasi utamanya.Pemahaman yang kuat dalam logika matematika, aljabar, dan probabilitas akan sangat membantu mahasiswa beradaptasi terutama pada tahun pertama perkuliahan.' />
          </section>
        </div>
      </Container>
    </section>
  )
}







export default faq
