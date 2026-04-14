import TryoutQuestionScreen from '@/modules/tryout/tryout-question-screen'

type TryoutQuestionNumberPageProps = {
  params: Promise<{
    subtest: string
    nomor_soal: string
  }>
}

const TryoutQuestionNumberPage = async ({
  params,
}: TryoutQuestionNumberPageProps) => {
  const { subtest, nomor_soal } = await params
  const parsedNumber = Number(nomor_soal)

  return (
    <TryoutQuestionScreen
      subtest={subtest}
      questionNumber={Number.isNaN(parsedNumber) ? -1 : parsedNumber}
    />
  )
}

export default TryoutQuestionNumberPage
