export type SubtestCode = 'pu' | 'ppu' | 'pbm' | 'pk' | 'lbi' | 'lbe' | 'pm'

export type QuestionType =
  | 'multiple_choice'
  | 'short_answer'
  | 'multiple_true_false'

export type QuestionOptions = {
  a: string
  b: string
  c: string
  d: string
  e: string
}

export type TryoutQuestion = {
  id: string
  subtest: SubtestCode
  number: number
  imageUrl?: string
  questionText: string
  type: QuestionType
  options?: QuestionOptions
  statements?: string[]
}

export const SUBTEST_META: Record<
  SubtestCode,
  { title: string; totalQuestions: number }
> = {
  pu: { title: 'Penalaran Umum', totalQuestions: 30 },
  ppu: { title: 'Pengetahuan dan Pemahaman Umum', totalQuestions: 20 },
  pbm: { title: 'Pemahaman Bacaan dan Menulis', totalQuestions: 20 },
  pk: { title: 'Pengetahuan Kuantitatif', totalQuestions: 20 },
  lbi: { title: 'Literasi dalam Bahasa Indonesia', totalQuestions: 20 },
  lbe: { title: 'Literasi dalam Bahasa Inggris', totalQuestions: 20 },
  pm: { title: 'Penalaran Matematika', totalQuestions: 20 },
}

const orderedSubtests = Object.keys(SUBTEST_META) as SubtestCode[]

const buildQuestionText = (
  subtest: SubtestCode,
  questionNumber: number,
  type: QuestionType
) => {
  const title = SUBTEST_META[subtest].title

  if (type === 'short_answer') {
    return `(${title}) Soal ${questionNumber}: Tuliskan jawaban singkat paling tepat berdasarkan konteks yang diberikan pada soal ini.`
  }

  if (type === 'multiple_true_false') {
    return `(${title}) Soal ${questionNumber}: Perhatikan lima pernyataan berikut dan tentukan setiap pernyataan bernilai Benar atau Salah.`
  }

  return `(${title}) Soal ${questionNumber}: Pilih satu jawaban yang paling tepat untuk menyelesaikan permasalahan berikut.`
}

const buildOptions = (subtest: SubtestCode, questionNumber: number): QuestionOptions => ({
  a: `Opsi A untuk ${subtest.toUpperCase()} nomor ${questionNumber}`,
  b: `Opsi B untuk ${subtest.toUpperCase()} nomor ${questionNumber}`,
  c: `Opsi C untuk ${subtest.toUpperCase()} nomor ${questionNumber}`,
  d: `Opsi D untuk ${subtest.toUpperCase()} nomor ${questionNumber}`,
  e: `Opsi E untuk ${subtest.toUpperCase()} nomor ${questionNumber}`,
})

const buildStatements = (subtest: SubtestCode, questionNumber: number) => [
  `Pernyataan 1 untuk ${subtest.toUpperCase()} nomor ${questionNumber}`,
  `Pernyataan 2 untuk ${subtest.toUpperCase()} nomor ${questionNumber}`,
  `Pernyataan 3 untuk ${subtest.toUpperCase()} nomor ${questionNumber}`,
  `Pernyataan 4 untuk ${subtest.toUpperCase()} nomor ${questionNumber}`,
  `Pernyataan 5 untuk ${subtest.toUpperCase()} nomor ${questionNumber}`,
]

const generateSubtestQuestions = (subtest: SubtestCode): TryoutQuestion[] => {
  const { totalQuestions } = SUBTEST_META[subtest]
  const questions: TryoutQuestion[] = []

  for (let questionNumber = 1; questionNumber <= totalQuestions; questionNumber += 1) {
    const typeSelector = questionNumber % 3
    const type: QuestionType =
      typeSelector === 1
        ? 'multiple_choice'
        : typeSelector === 2
          ? 'short_answer'
          : 'multiple_true_false'

    const includeImage = questionNumber % 5 === 0

    questions.push({
      id: `${subtest}-${questionNumber}`,
      subtest,
      number: questionNumber,
      type,
      questionText: buildQuestionText(subtest, questionNumber, type),
      imageUrl: includeImage
        ? `https://picsum.photos/seed/${subtest}-${questionNumber}/900/420`
        : undefined,
      options:
        type === 'multiple_choice' || type === 'multiple_true_false'
          ? buildOptions(subtest, questionNumber)
          : undefined,
      statements: type === 'multiple_true_false' ? buildStatements(subtest, questionNumber) : undefined,
    })
  }

  return questions
}

export const DUMMY_QUESTIONS_BY_SUBTEST: Record<SubtestCode, TryoutQuestion[]> =
  orderedSubtests.reduce((accumulator, subtest) => {
    accumulator[subtest] = generateSubtestQuestions(subtest)
    return accumulator
  }, {} as Record<SubtestCode, TryoutQuestion[]>)

export const isSubtestCode = (value: string): value is SubtestCode =>
  orderedSubtests.includes(value as SubtestCode)

export const mockFetchTryoutQuestion = async (
  subtest: string,
  questionNumber: number
): Promise<TryoutQuestion | null> => {
  if (!isSubtestCode(subtest)) {
    return null
  }

  const data = DUMMY_QUESTIONS_BY_SUBTEST[subtest][questionNumber - 1] ?? null

  return new Promise((resolve) => {
    setTimeout(() => resolve(data), 120)
  })
}
