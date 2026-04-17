'use client'

import StyledCard from '@/components/tryout/styled-card'
import AnswerCard from '@/modules/tryout/answer-card'
import { useTryoutData } from '../../tryout-context'
import { use } from 'react'
import Image from 'next/image'
import 'katex/dist/katex.min.css' // Import KaTeX styles
import katex from 'katex' // Import katex for rendering
import * as motion from 'motion/react-client'
import { redirect } from 'next/navigation'

const LatexRenderer = ({ content }: { content: string }) => {
  // Early return if the content is empty
  if (!content) {
    return null
  }

  // Properly normalize the LaTeX content from database
  const normalizeLatex = (latex: string) => {
    return latex
      .replace(/\\\\/g, '\\') // Convert \\ to \ for LaTeX commands
      .replace(/["”]/g, '"') // Fix curly quotes
  }

  // Function to render the content with LaTeX
  const renderWithLatex = () => {
    // Normalize content coming from the database
    const normalizedContent = normalizeLatex(content)

    // Step 1: Process block LaTeX expressions
    // Match block LaTeX surrounded by \[ \] or $$...$$
    const blockLatexRegex = /(\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$)/g
    let processedContent = normalizedContent
    const blockLatexMatches: string[] = []
    let blockMatch

    // Extract all block LaTeX and replace with placeholders
    while ((blockMatch = blockLatexRegex.exec(normalizedContent)) !== null) {
      const fullMatch = blockMatch[0]
      const latexContent = blockMatch[2] || blockMatch[3] // Get the content inside delimiters

      // Add to matches array and replace with placeholder
      blockLatexMatches.push(latexContent)
      processedContent = processedContent.replace(
        fullMatch,
        `[BLOCK_LATEX_${blockLatexMatches.length - 1}]`
      )
    }

    // Step 2: Process inline LaTeX expressions
    // Match inline LaTeX surrounded by \( \) or $...$
    const inlineLatexRegex = /(\\\(([\s\S]*?)\\\)|\$([\s\S]*?)\$)/g
    const inlineLatexMatches: string[] = []
    let inlineMatch

    // Extract all inline LaTeX and replace with placeholders
    while ((inlineMatch = inlineLatexRegex.exec(processedContent)) !== null) {
      const fullMatch = inlineMatch[0]
      const latexContent = inlineMatch[2] || inlineMatch[3] // Get the content inside delimiters

      // Add to matches array and replace with placeholder
      inlineLatexMatches.push(latexContent)
      processedContent = processedContent.replace(
        fullMatch,
        `[INLINE_LATEX_${inlineLatexMatches.length - 1}]`
      )
    }

    // Step 3: Render each piece and replace placeholders
    // Convert text parts and placeholders to JSX elements
    const parts = processedContent.split(
      /(\[BLOCK_LATEX_\d+\]|\[INLINE_LATEX_\d+\])/g
    )

    return parts.map((part, index) => {
      // Check if this part is a placeholder
      const blockMatch = part.match(/\[BLOCK_LATEX_(\d+)\]/)
      if (blockMatch) {
        const idx = parseInt(blockMatch[1])
        const formula = blockLatexMatches[idx]

        try {
          const html = katex.renderToString(formula, {
            throwOnError: false,
            displayMode: true,
            output: 'html',
          })

          return (
            <div
              key={`block-${index}`}
              // Reduce margin from my-2 (8px) to my-1 (4px)
              className='my-0 overflow-x-auto'
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )
        } catch (error) {
          console.error('Block LaTeX rendering error:', error)
          return (
            <div key={`block-${index}`} className='my-2 text-red-500'>
              {`$$${formula}$$`}
              <div className='mt-1 text-xs text-gray-500'>
                (LaTeX rendering failed)
              </div>
            </div>
          )
        }
      }

      const inlineMatch = part.match(/\[INLINE_LATEX_(\d+)\]/)
      if (inlineMatch) {
        const idx = parseInt(inlineMatch[1])
        const formula = inlineLatexMatches[idx]

        try {
          const html = katex.renderToString(formula, {
            throwOnError: false,
            displayMode: false,
            output: 'html',
          })

          return (
            <span
              key={`inline-${index}`}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )
        } catch (error) {
          console.error('Inline LaTeX rendering error:', error)
          return (
            <span key={`inline-${index}`} className='text-red-500'>
              {`$${formula}$`}
            </span>
          )
        }
      }

      // Regular text
      return part ? <span key={`text-${index}`}>{part}</span> : null
    })
  }

  return (
    <div className='w-full text-balance whitespace-pre-wrap'>
      {renderWithLatex()}
    </div>
  )
}

const TryoutPage = ({ params }: { params: Promise<{ id: number }> }) => {
  const { id } = use(params)
  const { value: soal, time, currentSubtest, initialAnswers } = useTryoutData()
  const currentSoal = soal[id - 1]

  if (!currentSoal) redirect('/tryout/soal/1')

  // Determine question type
  let variant: 'multiple_choice' | 'true_false' | 'uraian' = 'multiple_choice'
  if (currentSoal.true_false) variant = 'true_false'
  if (currentSoal.uraian) variant = 'uraian'

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'tween', duration: 0.15 }}
      className='grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6'
    >
      {/* Question Section */}
      <StyledCard title='Soal' className='lg:col-span-2'>
        <section className='h-96 overflow-y-auto'>
          {currentSoal.text_soal && (
            <LatexRenderer content={currentSoal.text_soal} />
          )}
          {currentSoal.path_gambar_soal && (
            <Image
              src={currentSoal.path_gambar_soal}
              alt='Question Image'
              width={500}
              height={300}
              className='rounded-lg'
            />
          )}
        </section>
      </StyledCard>

      {/* Answer Section */}
      <AnswerCard
        time={time}
        variant={variant}
        soal={[currentSoal]}
        soalSemua={soal}
        currentSubtest={currentSubtest}
        initialAnswers={initialAnswers}
      />
    </motion.main>
  )
}

export default TryoutPage
