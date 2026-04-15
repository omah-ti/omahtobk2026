import Container from '@/components/container'

const statistic = () => {
  return (
    <Container className='bg-primary-200 display-grid m-0 h-fit place-items-center py-[120px] max-sm:py-[60px]'>
      <div className='flex h-full w-4/5 flex-col gap-8.5 rounded-[30px] bg-neutral-100/70 pt-[95px] pb-[120px] max-sm:w-19/20 max-sm:rounded-[15px] max-sm:px-2.5 max-sm:py-4'>
        <section className='mx-auto w-6/10 text-center opacity-100 max-sm:w-full [&_h4]:text-[34px] [&_h4]:font-bold max-sm:[&_h4]:text-[16px] max-sm:[&_p]:text-[12px]'>
          <h4>
            Investasi Strategis pada Keahlian Teknologi untuk Karier di Era
            Global
          </h4>
          <p>
            Investasi pada keahlian teknologi memberikan imbal balik ekonomi
            yang signifikan seiring dengan percepatan transformasi digital
            global.
          </p>
        </section>
      </div>
      <div className='mx-auto mt-[-7.5%] flex w-14/25 rounded-[30px] bg-neutral-100 py-[25px] text-center shadow-[0_4px_4px_0_rgb(var(--color-neutral-1000)/0.25)] *:w-1/3 *:px-[25px] *:py-[5px] max-sm:mx-0 max-sm:mt-0 max-sm:w-19/20 max-sm:rounded-[15px] max-sm:px-[15px] max-sm:*:px-0 [&_h4]:text-[34px] [&_h4]:font-bold max-sm:[&_h4]:text-[16px] max-sm:[&_p]:text-[10px]'>
        <section>
          <h4>12-25jt</h4>
          <p>Rata-rata pendapatan bulanan (entry-level)</p>
        </section>
        <section className='border-x border-black max-sm:border-0'>
          <h4>22%</h4>
          <p>Proyeksi kebutuhan talenta hingga 2030</p>
        </section>
        <section>
          <h4>85%</h4>
          <p>Fleksibilitas kerja di sektor digital</p>
        </section>
      </div>
    </Container>
  )
}

export default statistic
