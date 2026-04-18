'use client'

import { ArrowLeft, ArrowRight, Check, Flag, LogOut, Menu, X } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { ApiFetchError, extractApiMessage, fetchJson } from '@/lib/fetch/http'
import { getAuthErrorMessage, logoutAuth } from '@/lib/fetch/auth'
import { API_GATEWAY_URL } from '@/lib/types/url'
import {
  getCurrentTryout,
  getSoal,
  saveSubtestAnswers,
  startSubtest,
  submitSubtest,
} from '@/lib/fetch/tryout-test'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type SubtestCode = 'pu' | 'ppu' | 'pbm' | 'pk' | 'lbi' | 'lbe' | 'pm'

type QuestionType =
  | 'multiple_choice'
  | 'short_answer'
  | 'multiple_true_false'

type ChoiceOption = {
  id: string
  label: string
}

type TrueFalseStatement = {
  id: string
  text: string
}

type TryoutQuestion = {
  id: string
  subtest: SubtestCode
  number: number
  imageUrl?: string
  questionText: string
  type: QuestionType
  options?: ChoiceOption[]
  statements?: TrueFalseStatement[]
}

type TryoutAnswer = {
  kode_soal: string
  jawaban: string
}

type LocalAnswerEntry = {
  kode_soal: string
  jawaban: string
  synced: boolean
  updatedAt: number
}

type LocalAnswerMap = Record<string, LocalAnswerEntry>

type TrueFalseSelection = Record<string, 'true' | 'false'>

type RuntimeCachePayload = {
  subtest: SubtestCode
  attemptId: number
  activeBackendSubtest: string
  timeLimitISO: string | null
  questions: TryoutQuestion[]
  answers: LocalAnswerMap
  updatedAt: number
}

type SubtestOutOfOrderPayload = {
  requested_subtest?: string
  active_subtest?: string
  attempt_id?: number
  message?: string
  error?: string
}

type BackendSoal = {
  kode_soal: string
  text_soal: string
  path_gambar_soal?: string | null
  pilihan_ganda?: Array<{
    soal_pilihan_ganda_id: string
    pilihan: string
  }>
  true_false?: Array<{
    soal_true_false_id: string
    pilihan_tf: string
  }>
  uraian?: {
    soal_uraian_id: string
    jawaban: string
  } | null
}

const SUBTEST_TO_BACKEND: Record<SubtestCode, string> = {
  pu: 'subtest_pu',
  ppu: 'subtest_ppu',
  pbm: 'subtest_pbm',
  pk: 'subtest_pk',
  lbi: 'subtest_lbi',
  lbe: 'subtest_lbe',
  pm: 'subtest_pm',
}

const BACKEND_TO_SUBTEST: Record<string, SubtestCode> = {
  subtest_pu: 'pu',
  subtest_ppu: 'ppu',
  subtest_pbm: 'pbm',
  subtest_pk: 'pk',
  subtest_lbi: 'lbi',
  subtest_lbe: 'lbe',
  subtest_pm: 'pm',
}

const SUBTEST_META: Record<
  SubtestCode,
  { title: string; totalQuestions: number }
> = {
  pu: { title: 'Kemampuan Penalaran Umum', totalQuestions: 34 },
  ppu: { title: 'Pengetahuan dan Pemahaman Umum', totalQuestions: 20 },
  pbm: { title: 'Kemampuan Memahami Bacaan dan Menulis', totalQuestions: 20 },
  pk: { title: 'Pengetahuan Kuantitatif', totalQuestions: 20 },
  lbi: { title: 'Literasi dalam Bahasa Indonesia', totalQuestions: 36 },
  lbe: { title: 'Literasi dalam Bahasa Inggris', totalQuestions: 20 },
  pm: { title: 'Penalaran Matematika', totalQuestions: 20 },
}

const orderedSubtests = Object.keys(SUBTEST_META) as SubtestCode[]

const isSubtestCode = (value: string): value is SubtestCode =>
  orderedSubtests.includes(value as SubtestCode)

const mapBackendQuestionType = (question: BackendSoal): QuestionType => {
  if (Array.isArray(question.true_false) && question.true_false.length > 0) {
    return 'multiple_true_false'
  }

  if (question.uraian) {
    return 'short_answer'
  }

  return 'multiple_choice'
}

const splitKodeSoal = (kodeSoal: string) => {
  const trimmed = (kodeSoal || '').trim()
  const match = trimmed.match(/^(.*?)(\d+)$/)

  if (!match) {
    return {
      prefix: trimmed.toLowerCase(),
      number: Number.NaN,
      raw: trimmed.toLowerCase(),
    }
  }

  return {
    prefix: (match[1] || '').toLowerCase(),
    number: Number(match[2]),
    raw: trimmed.toLowerCase(),
  }
}

const compareKodeSoal = (left: string, right: string) => {
  const a = splitKodeSoal(left)
  const b = splitKodeSoal(right)

  if (a.prefix !== b.prefix) {
    return a.prefix.localeCompare(b.prefix)
  }

  const aHasNumber = Number.isFinite(a.number)
  const bHasNumber = Number.isFinite(b.number)

  if (aHasNumber && bHasNumber && a.number !== b.number) {
    return a.number - b.number
  }

  if (aHasNumber !== bHasNumber) {
    return aHasNumber ? -1 : 1
  }

  return a.raw.localeCompare(b.raw)
}

const mapBackendQuestions = (
  raw: BackendSoal[],
  subtest: SubtestCode
): TryoutQuestion[] => {
  const sortedRaw = [...raw].sort((a, b) =>
    compareKodeSoal(a.kode_soal, b.kode_soal)
  )

  return sortedRaw.map((item, index) => ({
    id: item.kode_soal,
    subtest,
    number: index + 1,
    imageUrl: item.path_gambar_soal || undefined,
    questionText: item.text_soal || '',
    type: mapBackendQuestionType(item),
    options: (item.pilihan_ganda || []).map((option) => ({
      id: option.soal_pilihan_ganda_id,
      label: option.pilihan,
    })),
    statements: (item.true_false || []).map((statement) => ({
      id: statement.soal_true_false_id,
      text: statement.pilihan_tf,
    })),
  }))
}

const formatTime = (totalSeconds: number) => {
  const safe = Math.max(0, totalSeconds)
  const hours = Math.floor(safe / 3600)
    .toString()
    .padStart(2, '0')
  const minutes = Math.floor((safe % 3600) / 60)
    .toString()
    .padStart(2, '0')
  const seconds = Math.floor(safe % 60)
    .toString()
    .padStart(2, '0')

  return `${hours}:${minutes}:${seconds}`
}

const normalizeLatexInput = (input: string) => {
  return input
    .replace(/\\\\/g, '\\')
    .replace(/\\left/g, '')
    .replace(/\\right/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
}

const TABULAR_BLOCK_REGEX =
  /\\begin\{tabular\}\{[^}]*\}([\s\S]*?)\\end\{tabular\}/g

const ARABIC_ENUMERATE_BLOCK_REGEX =
  /\\begin\{enumerate\}\[[^\]]*label=\(\\arabic\*\)[^\]]*\]([\s\S]*?)\\end\{enumerate\}/g

const convertEnumerateItemsToNumberedList = (body: string) => {
  const itemRegex = /\\item\s*([\s\S]*?)(?=(\\item|$))/g
  const items: string[] = []
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(body)) !== null) {
    const item = (match[1] || '')
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{2,}/g, '\n')
      .trim()

    if (item) {
      items.push(item)
    }
  }

  if (items.length === 0) {
    return ''
  }

  return items.map((item, index) => `${index + 1}. ${item}`).join('\n')
}

const splitTabularRows = (body: string) => {
  const stripped = body
    .replace(/\\hline/g, '\n')
    .replace(/\r\n/g, '\n')

  const rows = stripped
    .split(/\\\\(?:\s*\[[^\]]*\])?/g)
    .map((row) => row.trim())
    .filter(Boolean)

  return rows.map((row) =>
    row
      .split('&')
      .map((cell) =>
        cell
          .replace(/\\textbf\{([^{}]*)\}/g, '$1')
          .replace(/\\quad/g, ' ')
          .replace(/[ \t]+/g, ' ')
          .trim()
      )
      .filter(Boolean)
  )
}

const renderLegacyTabularNode = (body: string, key: string): ReactNode | null => {
  const rows = splitTabularRows(body)
  if (rows.length === 0) {
    return null
  }

  const maxColumns = Math.max(...rows.map((row) => row.length))

  return (
    <div key={key} className='my-3 w-full overflow-x-auto'>
      <table className='mx-auto border-collapse text-[14px] text-neutral-800 md:text-[16px]'>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${key}-row-${rowIndex}`}>
              {Array.from({ length: maxColumns }, (_, colIndex) => {
                const cell = row[colIndex] || ''

                return (
                  <td
                    key={`${key}-row-${rowIndex}-col-${colIndex}`}
                    className={`border border-neutral-400 px-4 py-3 text-center align-middle ${
                      rowIndex === 0 ? 'font-bold' : ''
                    }`}
                  >
                    {renderInlineLatex(cell, `${key}-cell-${rowIndex}-${colIndex}`)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const normalizeLegacyLatexArtifacts = (input: string) => {
  let next = input

  next = next.replace(ARABIC_ENUMERATE_BLOCK_REGEX, (_, body: string) => {
    const numbered = convertEnumerateItemsToNumberedList(body)
    return numbered ? `\n${numbered}\n` : '\n'
  })

  next = next
    .replace(/\\renewcommand\{\\arraystretch\}\{[^}]*\}/g, ' ')
    .replace(/\\begin\{center\}|\\end\{center\}/g, '\n')
    .replace(/\\begin\{enumerate\}(?:\[[^\]]*\])?/g, '\n')
    .replace(/\\end\{enumerate\}/g, '\n')
    .replace(/^\s*\\item\s*/g, '')
    .replace(/\\item\s*/g, '\n- ')
    .replace(/~?\\underline\{\s*\\hspace\{[^}]*\}\s*\}/g, ' ____ ')
    .replace(/\\hspace\{[^}]*\}/g, ' ')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\ldots/g, '...')
    .replace(/\\textbf\{([^{}]*)\}/g, '$1')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')

  return next.trim()
}

const renderPlainWithLegacyArtifacts = (
  content: string,
  keyPrefix: string
): ReactNode[] => {
  const normalized = normalizeLegacyLatexArtifacts(content)
  if (!normalized) {
    return []
  }

  const tableRegex = new RegExp(TABULAR_BLOCK_REGEX.source, 'g')
  const nodes: ReactNode[] = []
  let cursor = 0
  let index = 0
  let match: RegExpExecArray | null

  while ((match = tableRegex.exec(normalized)) !== null) {
    const matchStart = match.index
    const matchEnd = match.index + match[0].length

    if (matchStart > cursor) {
      const plain = normalized.slice(cursor, matchStart)
      if (plain) {
        nodes.push(...renderInlineLatex(plain, `${keyPrefix}-plain-${index}`))
      }
    }

    const tabularBody = match[1] ?? ''
    const tableNode = renderLegacyTabularNode(
      tabularBody,
      `${keyPrefix}-table-${index}`
    )

    if (tableNode) {
      nodes.push(tableNode)
    }

    cursor = matchEnd
    index += 1
  }

  const tail = normalized.slice(cursor)
  if (tail) {
    nodes.push(...renderInlineLatex(tail, `${keyPrefix}-tail`))
  }

  return nodes
}

const renderLatexNode = (latex: string, displayMode: boolean, key: string) => {
  const source = normalizeLatexInput(latex.trim())

  if (!source) {
    return null
  }

  try {
    const html = katex.renderToString(source, {
      throwOnError: false,
      displayMode,
      strict: false,
      trust: true,
      output: 'html',
    })

    return (
      <span
        key={key}
        className={displayMode ? 'my-2 block w-full overflow-x-auto' : ''}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  } catch {
    return (
      <span key={key} className='whitespace-pre-wrap'>
        {displayMode ? `$$${source}$$` : `$${source}$`}
      </span>
    )
  }
}

const renderInlineLatex = (content: string, keyPrefix: string): ReactNode[] => {
  const inlineRegex = /(\\\((.*?)\\\)|\$([^$\n]+?)\$)/g
  const parts: ReactNode[] = []
  let cursor = 0
  let index = 0
  let match: RegExpExecArray | null

  while ((match = inlineRegex.exec(content)) !== null) {
    const matchStart = match.index
    const matchEnd = match.index + match[0].length

    if (matchStart > cursor) {
      const plain = content.slice(cursor, matchStart)
      if (plain) {
        parts.push(
          <span key={`${keyPrefix}-plain-${index}`} className='whitespace-pre-wrap'>
            {plain}
          </span>
        )
        index += 1
      }
    }

    const latex = match[2] ?? match[3] ?? ''
    const latexNode = renderLatexNode(latex, false, `${keyPrefix}-inline-${index}`)

    if (latexNode) {
      parts.push(latexNode)
    }

    cursor = matchEnd
    index += 1
  }

  const tail = content.slice(cursor)
  if (tail) {
    parts.push(
      <span key={`${keyPrefix}-tail`} className='whitespace-pre-wrap'>
        {tail}
      </span>
    )
  }

  return parts
}

const renderTextWithLatex = (content: string, keyPrefix: string): ReactNode[] => {
  const normalized = normalizeLatexInput(content)
  const blockRegex = /(\\\[(.*?)\\\]|\$\$([\s\S]*?)\$\$)/g
  const nodes: ReactNode[] = []
  let cursor = 0
  let index = 0
  let match: RegExpExecArray | null

  while ((match = blockRegex.exec(normalized)) !== null) {
    const matchStart = match.index
    const matchEnd = match.index + match[0].length

    if (matchStart > cursor) {
      const plain = normalized.slice(cursor, matchStart)
      if (plain) {
        nodes.push(
          ...renderPlainWithLegacyArtifacts(plain, `${keyPrefix}-plain-${index}`)
        )
      }
    }

    const latex = match[2] ?? match[3] ?? ''
    const blockNode = renderLatexNode(latex, true, `${keyPrefix}-block-${index}`)
    if (blockNode) {
      nodes.push(blockNode)
    }

    cursor = matchEnd
    index += 1
  }

  const tail = normalized.slice(cursor)
  if (tail) {
    nodes.push(...renderPlainWithLegacyArtifacts(tail, `${keyPrefix}-tail`))
  }

  return nodes
}

type RichTextSegment =
  | { type: 'text'; value: string }
  | { type: 'image'; url: string; mode: 'inline' | 'block' }

const INLINE_IMAGE_TOKEN_REGEX = /\[img:([^\]]+)\]/gi
const TOP_IMAGE_FORCE_MARKER_STRIP_REGEX =
  /\[(?:img-top|top-image|force-top-image)\]/gi
const TOP_IMAGE_FORCE_MARKER_TEST_REGEX =
  /\[(?:img-top|top-image|force-top-image)\]/i
const TOP_IMAGE_PROMPT_HINT_REGEX =
  /\b(?:gambar|grafik|diagram|tabel)\s+di\s+atas\b/i

const parseImageTokenPayload = (payloadRaw: string) => {
  const payload = (payloadRaw || '').trim()
  if (!payload) {
    return { mode: 'inline' as const, url: '' }
  }

  const lowerPayload = payload.toLowerCase()
  if (lowerPayload.startsWith('block:')) {
    return { mode: 'block' as const, url: payload.slice('block:'.length).trim() }
  }

  if (lowerPayload.startsWith('inline:')) {
    return { mode: 'inline' as const, url: payload.slice('inline:'.length).trim() }
  }

  return { mode: 'inline' as const, url: payload }
}

const parseRichTextSegments = (content: string): RichTextSegment[] => {
  const result: RichTextSegment[] = []
  const imageRegex = /\[img:([^\]]+)\]/gi
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = imageRegex.exec(content)) !== null) {
    const matchStart = match.index
    const matchEnd = match.index + match[0].length

    if (matchStart > cursor) {
      result.push({
        type: 'text',
        value: content.slice(cursor, matchStart),
      })
    }

    const parsed = parseImageTokenPayload(match[1] || '')
    if (parsed.url) {
      result.push({ type: 'image', url: parsed.url, mode: parsed.mode })
    }

    cursor = matchEnd
  }

  if (cursor < content.length) {
    result.push({ type: 'text', value: content.slice(cursor) })
  }

  return result
}

const getInlineImageUrls = (content: string): string[] => {
  const matches = [...content.matchAll(INLINE_IMAGE_TOKEN_REGEX)]
  return matches
    .map((match) => parseImageTokenPayload(match[1] || '').url)
    .filter((url) => url.length > 0)
}

const normalizeImageUrl = (value: string) => {
  return value.trim().replace(/\/+$/, '')
}

const shouldShowTopImage = (question: TryoutQuestion) => {
  if (!question.imageUrl) {
    return false
  }

  const rawText = question.questionText || ''
  const forceTopImage = TOP_IMAGE_FORCE_MARKER_TEST_REGEX.test(rawText)
  const textWithoutMarker = rawText.replace(TOP_IMAGE_FORCE_MARKER_STRIP_REGEX, ' ')
  const inlineImageUrls = getInlineImageUrls(textWithoutMarker)

  if (forceTopImage || TOP_IMAGE_PROMPT_HINT_REGEX.test(textWithoutMarker)) {
    return true
  }

  if (inlineImageUrls.length === 0) {
    return true
  }

  if (inlineImageUrls.length === 1) {
    const topImage = normalizeImageUrl(question.imageUrl)
    const inlineImage = normalizeImageUrl(inlineImageUrls[0])
    return topImage !== inlineImage
  }

  return false
}

const sanitizeQuestionText = (content: string) => {
  return content
    .replace(TOP_IMAGE_FORCE_MARKER_STRIP_REGEX, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const RichTextContent = ({
  content,
  className,
}: {
  content: string
  className?: string
}) => {
  const segments = useMemo(() => parseRichTextSegments(content), [content])

  return (
    <div className={className}>
      {segments.map((segment, index) => {
        if (segment.type === 'image') {
          if (segment.mode === 'block') {
            return (
              <div key={`rich-image-${index}`} className='my-3 flex w-full justify-center'>
                <img
                  src={segment.url}
                  alt='Gambar pendukung soal'
                  className='h-auto max-h-[360px] w-full max-w-[680px] rounded-md border border-neutral-200 object-contain'
                  loading='lazy'
                />
              </div>
            )
          }

          return (
            <img
              key={`rich-image-${index}`}
              src={segment.url}
              alt='Gambar pendukung soal'
              className='mx-1 inline-block h-[1.4em] w-auto max-h-[52px] max-w-[240px] align-[-0.2em] rounded-sm border border-neutral-200 object-contain'
              loading='lazy'
            />
          )
        }

        return (
          <span key={`rich-text-${index}`} className='leading-relaxed'>
            {renderTextWithLatex(segment.value, `rich-${index}`)}
          </span>
        )
      })}
    </div>
  )
}

const parseAnswerTokenSet = (raw: string) => {
  const set = new Set<string>()

  raw
    .split(/[|,;/\s]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .forEach((token) => {
      set.add(token)
    })

  return set
}

const parseLooseBooleanValue = (raw: string): 'true' | 'false' | null => {
  switch ((raw || '').trim().toLowerCase()) {
    case 'true':
    case '1':
    case 'yes':
    case 'y':
    case 'benar':
      return 'true'
    case 'false':
    case '0':
    case 'no':
    case 'n':
    case 'salah':
      return 'false'
    default:
      return null
  }
}

const parseTrueFalseSelection = (
  raw: string | null | undefined
): TrueFalseSelection => {
  const result: TrueFalseSelection = {}
  if (!raw) {
    return result
  }

  const trimmed = raw.trim()
  if (!trimmed) {
    return result
  }

  if (parseLooseBooleanValue(trimmed) != null) {
    return result
  }

  if (trimmed.includes(':')) {
    trimmed
      .split(/[|,;]+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .forEach((token) => {
        const [id, value] = token.split(':')
        const idSafe = id?.trim()
        const valueSafe = value?.trim().toLowerCase()

        if (!idSafe || (valueSafe !== 'true' && valueSafe !== 'false')) {
          return
        }

        result[idSafe] = valueSafe
      })

    return result
  }

  parseAnswerTokenSet(trimmed).forEach((id) => {
    result[id] = 'true'
  })

  return result
}

const serializeTrueFalseSelection = (selection: TrueFalseSelection) => {
  return Object.entries(selection)
    .map(([id, value]) => `${id}:${value}`)
    .join('|')
}

const toTrueFalsePayload = (selection: TrueFalseSelection) => {
  return Object.entries(selection)
    .filter(([, value]) => value === 'true')
    .map(([id]) => id)
    .join(',')
}

const decodeStoredAnswers = (raw: string | null): LocalAnswerMap => {
  if (!raw) {
    return {}
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return {}
    }

    const entries = Object.entries(parsed as Record<string, unknown>)
    const result: LocalAnswerMap = {}

    entries.forEach(([kodeSoal, value]) => {
      if (!value || typeof value !== 'object') {
        return
      }

      const casted = value as Partial<LocalAnswerEntry>
      result[kodeSoal] = {
        kode_soal: kodeSoal,
        jawaban: typeof casted.jawaban === 'string' ? casted.jawaban : '',
        synced: Boolean(casted.synced),
        updatedAt:
          typeof casted.updatedAt === 'number' ? casted.updatedAt : Date.now(),
      }
    })

    return result
  } catch {
    return {}
  }
}

const decodeRuntimeCache = (raw: string | null): RuntimeCachePayload | null => {
  if (!raw) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    const value = parsed as Partial<RuntimeCachePayload>
    if (
      typeof value.subtest !== 'string' ||
      typeof value.attemptId !== 'number' ||
      typeof value.activeBackendSubtest !== 'string' ||
      !Array.isArray(value.questions) ||
      typeof value.answers !== 'object' ||
      value.answers == null ||
      typeof value.updatedAt !== 'number'
    ) {
      return null
    }

    return {
      subtest: value.subtest as SubtestCode,
      attemptId: value.attemptId,
      activeBackendSubtest: value.activeBackendSubtest,
      timeLimitISO:
        typeof value.timeLimitISO === 'string' ? value.timeLimitISO : null,
      questions: value.questions as TryoutQuestion[],
      answers: value.answers as LocalAnswerMap,
      updatedAt: value.updatedAt,
    }
  } catch {
    return null
  }
}

type TryoutQuestionScreenProps = {
  subtest: string
  questionNumber: number
}

const cardShadow =
  'shadow-[0_3px_10px_rgba(0,0,0,0.10),0_2px_4px_rgba(0,0,0,0.08)]'

const numberButtonBase =
  'rounded-md border py-2 text-[14px] font-medium transition-colors'

const actionButtonOutline =
  'flex items-center justify-center gap-2 rounded-lg border border-[#0D3388] bg-white px-4 py-[10px] text-[14px] font-bold text-[#0D3388] transition-colors hover:bg-[#0D3388] hover:text-white md:text-[16px]'

const actionButtonSolid =
  'flex items-center justify-center gap-2 rounded-lg border border-[#0D3388] bg-[#0D3388] px-4 py-[10px] text-[14px] font-bold text-white transition-colors hover:bg-[#0A276A] md:text-[16px]'

const getQuestionPath = (subtest: SubtestCode, questionNumber: number) =>
  `/tryout/${subtest}/${questionNumber}`

const MULTIPLE_CHOICE_REQUIRED_SELECTIONS: Record<string, number> = {
  'pu-023': 2,
  'pu-025': 2,
}

const normalizeKodeSoalKey = (value: string) => value.trim().toLowerCase()

const getRequiredMultipleChoiceSelections = (
  question: Pick<TryoutQuestion, 'id' | 'type'> | null | undefined
) => {
  if (!question || question.type !== 'multiple_choice') {
    return 1
  }

  return MULTIPLE_CHOICE_REQUIRED_SELECTIONS[normalizeKodeSoalKey(question.id)] ?? 1
}

type QuestionAnswerState = 'empty' | 'partial' | 'complete'

const getQuestionAnswerState = (
  question: TryoutQuestion,
  rawAnswer: string
): QuestionAnswerState => {
  const answer = rawAnswer.trim()

  if (question.type === 'multiple_choice') {
    const requiredSelections = getRequiredMultipleChoiceSelections(question)
    const selectedCount = parseAnswerTokenSet(answer).size

    if (selectedCount === 0) {
      return 'empty'
    }

    if (selectedCount < requiredSelections) {
      return 'partial'
    }

    return 'complete'
  }

  if (question.type === 'multiple_true_false') {
    const statements = question.statements || []
    if (statements.length === 0) {
      return 'empty'
    }

    const selection = parseTrueFalseSelection(answer)

    if (statements.length === 1) {
      const statementId = statements[0].id
      const selected = selection[statementId] || parseLooseBooleanValue(answer)
      if (selected === 'true' || selected === 'false') {
        return 'complete'
      }

      return 'empty'
    }

    let answeredCount = 0
    statements.forEach((statement) => {
      const selected = selection[statement.id]
      if (selected === 'true' || selected === 'false') {
        answeredCount += 1
      }
    })

    if (answeredCount === 0) {
      return 'empty'
    }

    if (answeredCount < statements.length) {
      return 'partial'
    }

    return 'complete'
  }

  return answer.length > 0 ? 'complete' : 'empty'
}

const isQuestionAnswered = (question: TryoutQuestion, rawAnswer: string) => {
  return getQuestionAnswerState(question, rawAnswer) === 'complete'
}

const getSubtestOutOfOrderPayload = (
  error: unknown
): SubtestOutOfOrderPayload | null => {
  if (!(error instanceof ApiFetchError) || error.status !== 409) {
    return null
  }

  if (typeof error.payload !== 'object' || error.payload == null) {
    return null
  }

  const payload = error.payload as SubtestOutOfOrderPayload
  const message = `${payload.message || ''} ${payload.error || ''}`.toLowerCase()

  if (payload.active_subtest || message.includes('subtest is not active yet')) {
    return payload
  }

  return null
}

const isSubtestOutOfOrderError = (error: unknown) => {
  if (getSubtestOutOfOrderPayload(error)) {
    return true
  }

  if (!(error instanceof Error)) {
    return false
  }

  return (error.message || '').toLowerCase().includes('subtest is not active yet')
}

const isCommittedSubmitFallbackError = (error: unknown) => {
  if (!(error instanceof ApiFetchError) || error.status !== 503) {
    return false
  }

  const message = `${error.message || ''} ${extractApiMessage(error.payload) || ''}`
    .toLowerCase()
    .trim()

  return (
    message.includes('tryout finalized but scoring is not available yet') ||
    message.includes('scoring is not available yet')
  )
}

const isTryoutTerminalStateError = (error: unknown) => {
  if (!(error instanceof ApiFetchError)) {
    return false
  }

  if (error.status === 404 || error.status === 410) {
    return true
  }

  if (error.status !== 409) {
    return false
  }

  const message = `${error.message || ''} ${extractApiMessage(error.payload) || ''}`
    .toLowerCase()
    .trim()

  return (
    message.includes('tryout attempt state is no longer valid') ||
    message.includes('no ongoing attempt found') ||
    message.includes('time limit has been reached')
  )
}

const hasExpiredTimeLimit = (value: Date | string | null | undefined) => {
  if (!value) {
    return false
  }

  const timestamp =
    value instanceof Date ? value.getTime() : new Date(value).getTime()

  if (!Number.isFinite(timestamp)) {
    return false
  }

  return Date.now() >= timestamp
}

const TryoutQuestionScreen = ({
  subtest,
  questionNumber,
}: TryoutQuestionScreenProps) => {
  const router = useRouter()
  const lastSyncAtRef = useRef(0)
  const autoSubmitTriggeredRef = useRef(false)
  const timeLimitRef = useRef<Date | null>(null)
  const localStorageKeyRef = useRef<string | null>(null)
  const runtimeCacheKeyRef = useRef<string | null>(null)
  const [username, setUsername] = useState('Pengguna')
  const [questions, setQuestions] = useState<TryoutQuestion[]>([])
  const [answers, setAnswers] = useState<LocalAnswerMap>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState('00:00:00')
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isIncompleteModalOpen, setIsIncompleteModalOpen] = useState(false)
  const [isTimeUpModalOpen, setIsTimeUpModalOpen] = useState(false)
  const [isReturningToDashboard, setIsReturningToDashboard] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isSmallScreen, setIsSmallScreen] = useState(false)
  const [timeLimit, setTimeLimit] = useState<Date | null>(null)
  const [attemptId, setAttemptId] = useState<number | null>(null)
  const [activeBackendSubtest, setActiveBackendSubtest] = useState<string | null>(
    null
  )
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>(
    'idle'
  )

  const subtestValid = isSubtestCode(subtest)
  const currentSubtest = SUBTEST_META[subtest as SubtestCode]
  const runtimeCacheKey = subtestValid ? `tryout_runtime_${subtest}` : null

  const questionById = useMemo(() => {
    const map = new Map<string, TryoutQuestion>()
    questions.forEach((item) => {
      map.set(item.id, item)
    })
    return map
  }, [questions])

  const totalQuestions = questions.length || currentSubtest?.totalQuestions || 0
  const question = questions[questionNumber - 1] || null

  const unansweredQuestionNumbers = useMemo(() => {
    return questions
      .filter((item) => !isQuestionAnswered(item, answers[item.id]?.jawaban || ''))
      .map((item) => item.number)
  }, [answers, questions])

  const firstUnansweredQuestionNumber = unansweredQuestionNumbers[0] ?? null

  const questionDisplay = useMemo(() => {
    if (!question) {
      return {
        text: '',
        showTopImage: false,
      }
    }

    return {
      text: sanitizeQuestionText(question.questionText || ''),
      showTopImage: shouldShowTopImage(question),
    }
  }, [question])

  const localStorageKey = useMemo(() => {
    if (!attemptId || !activeBackendSubtest) {
      return null
    }

    return `tryout_answers_${attemptId}_${activeBackendSubtest}`
  }, [activeBackendSubtest, attemptId])

  useEffect(() => {
    timeLimitRef.current = timeLimit
  }, [timeLimit])

  useEffect(() => {
    localStorageKeyRef.current = localStorageKey
  }, [localStorageKey])

  useEffect(() => {
    runtimeCacheKeyRef.current = runtimeCacheKey
  }, [runtimeCacheKey])

  const showTimeUpModalFallback = useCallback(
    (options?: {
      overrideLocalStorageKey?: string | null
      overrideRuntimeCacheKey?: string | null
    }) => {
      const localKeyToClear =
        options?.overrideLocalStorageKey ?? localStorageKeyRef.current
      const runtimeKeyToClear =
        options?.overrideRuntimeCacheKey ?? runtimeCacheKeyRef.current

      if (localKeyToClear) {
        localStorage.removeItem(localKeyToClear)
      }
      if (runtimeKeyToClear) {
        sessionStorage.removeItem(runtimeKeyToClear)
      }

      autoSubmitTriggeredRef.current = true
      setIsReturningToDashboard(false)
      setActionError('Waktu habis. Jawaban subtest sudah ditutup.')
      setIsTimeUpModalOpen(true)
    },
    []
  )

  const redirectToActiveSubtest = useCallback(async (preferredBackendSubtest?: string | null) => {
    try {
      let activeBackend = preferredBackendSubtest || null

      if (!activeBackend) {
        const currentTryout = await getCurrentTryout('', true)
        activeBackend =
          (currentTryout?.data?.subtest_sekarang as string | undefined) || null
      }

      const activeCode = activeBackend ? BACKEND_TO_SUBTEST[activeBackend] : undefined

      if (!activeCode || activeCode === subtest) {
        return false
      }

      if (runtimeCacheKey) {
        sessionStorage.removeItem(runtimeCacheKey)
      }

      router.replace(getQuestionPath(activeCode, 1))
      return true
    } catch (error) {
      console.error('Failed to resolve active subtest for redirect:', error)
      return false
    }
  }, [router, runtimeCacheKey, subtest])

  const persistAnswers = useCallback(
    (next: LocalAnswerMap) => {
      if (!localStorageKey) {
        return
      }

      localStorage.setItem(localStorageKey, JSON.stringify(next))
    },
    [localStorageKey]
  )

  const setAnswerValue = useCallback(
    (kodeSoal: string, jawaban: string) => {
      setAnswers((previous) => {
        const next: LocalAnswerMap = {
          ...previous,
          [kodeSoal]: {
            kode_soal: kodeSoal,
            jawaban,
            synced: false,
            updatedAt: Date.now(),
          },
        }

        persistAnswers(next)
        return next
      })
    },
    [persistAnswers]
  )

  const toPayloadAnswerValue = useCallback(
    (entry: LocalAnswerEntry) => {
      const questionMeta = questionById.get(entry.kode_soal)
      if (!questionMeta) {
        return entry.jawaban.trim()
      }

      if (questionMeta.type === 'multiple_choice') {
        const requiredSelections = getRequiredMultipleChoiceSelections(questionMeta)
        if (requiredSelections > 1) {
          const selected = parseAnswerTokenSet(entry.jawaban)
          const orderedByOption = (questionMeta.options || [])
            .map((option) => option.id)
            .filter((id) => selected.has(id))

          const normalized =
            orderedByOption.length > 0 ? orderedByOption : Array.from(selected)

          return normalized.slice(0, requiredSelections).join(',')
        }

        return entry.jawaban.trim()
      }

      if (questionMeta.type === 'multiple_true_false') {
        const selection = parseTrueFalseSelection(entry.jawaban)

        const statementIds = (questionMeta.statements || []).map(
          (statement) => statement.id
        )

        if (statementIds.length === 1) {
          const statementId = statementIds[0]
          const selected = selection[statementId]
          if (selected === 'true' || selected === 'false') {
            return selected
          }

          const fallbackBool = parseLooseBooleanValue(entry.jawaban)
          return fallbackBool ?? ''
        }

        return toTrueFalsePayload(selection)
      }

      return entry.jawaban.trim()
    },
    [questionById]
  )

  const flushDirtyAnswers = useCallback(
    async (
      force: boolean,
      options?: {
        onOutOfOrder?: 'active-subtest' | 'dashboard'
      }
    ) => {
      if (!activeBackendSubtest) {
        return true
      }

      if (!force && Date.now() - lastSyncAtRef.current < 6000) {
        return true
      }

      const pendingEntries = Object.values(answers).filter((entry) =>
        force ? true : !entry.synced
      )

      if (pendingEntries.length === 0) {
        return true
      }

      const payloadAnswers: TryoutAnswer[] = pendingEntries
        .map((entry) => ({
          kode_soal: entry.kode_soal,
          jawaban: toPayloadAnswerValue(entry),
        }))
        .filter((entry) => entry.jawaban.trim().length > 0)

      try {
        setSyncStatus('syncing')

        if (payloadAnswers.length > 0) {
          await saveSubtestAnswers(
            activeBackendSubtest,
            { answers: payloadAnswers },
            '',
            true
          )
        }

        const pendingCodeSet = new Set(
          pendingEntries.map((entry) => entry.kode_soal)
        )

        setAnswers((previous) => {
          const next = { ...previous }
          pendingCodeSet.forEach((kodeSoal) => {
            if (!next[kodeSoal]) {
              return
            }

            next[kodeSoal] = {
              ...next[kodeSoal],
              synced: true,
            }
          })

          persistAnswers(next)
          return next
        })

        setSyncStatus('idle')
        lastSyncAtRef.current = Date.now()
        return true
      } catch (error) {
        console.error('Failed to sync tryout answers:', error)

        if (isSubtestOutOfOrderError(error)) {
          const payload = getSubtestOutOfOrderPayload(error)
          if (options?.onOutOfOrder === 'dashboard') {
            showTimeUpModalFallback()
            return false
          }

          if (hasExpiredTimeLimit(timeLimitRef.current)) {
            showTimeUpModalFallback()
            return false
          }

          setActionError('Subtest aktif berubah. Kamu akan diarahkan ke subtest yang benar.')
          await redirectToActiveSubtest(payload?.active_subtest)
          return false
        }

        if (isTryoutTerminalStateError(error)) {
          router.replace('/dashboard-home')
          return false
        }

        setSyncStatus('error')
        return false
      }
    },
    [
      activeBackendSubtest,
      answers,
      localStorageKey,
      persistAnswers,
      redirectToActiveSubtest,
      router,
      runtimeCacheKey,
      showTimeUpModalFallback,
      toPayloadAnswerValue,
    ]
  )

  const navigateToQuestion = useCallback(
    async (number: number) => {
      setIsMobileSidebarOpen(false)
      setActionError(null)
      router.push(getQuestionPath(subtest as SubtestCode, number))
    },
    [router, subtest]
  )

  const returnToDashboardAfterTimeUp = useCallback(() => {
    if (isReturningToDashboard) {
      return
    }

    setIsReturningToDashboard(true)
    setIsTimeUpModalOpen(false)
    router.replace('/dashboard-home')
  }, [isReturningToDashboard, router])

  const submitCurrentSubtest = useCallback(async (options?: {
    forceSubmit?: boolean
    triggeredByTimeUp?: boolean
  }) => {
    if (!activeBackendSubtest || isSubmitting) {
      return
    }

    const forceSubmit = Boolean(options?.forceSubmit)
    const triggeredByTimeUp = Boolean(options?.triggeredByTimeUp)
    const isTimeUp = timeLimit ? Date.now() >= timeLimit.getTime() : false

    if (!forceSubmit && !isTimeUp && unansweredQuestionNumbers.length > 0) {
      setIsIncompleteModalOpen(true)
      return
    }

    setIsSubmitting(true)
    setActionError(null)

    try {
      const shouldReturnToDashboard = forceSubmit || isTimeUp
      const flushSucceeded = await flushDirtyAnswers(true, {
        onOutOfOrder: shouldReturnToDashboard ? 'dashboard' : 'active-subtest',
      })
      if (!flushSucceeded) {
        return
      }

      const payloadAnswers: TryoutAnswer[] = Object.values(answers)
        .map((entry) => ({
          kode_soal: entry.kode_soal,
          jawaban: toPayloadAnswerValue(entry),
        }))
        .filter((entry) => entry.jawaban.trim().length > 0)

      await submitSubtest(
        activeBackendSubtest,
        { answers: payloadAnswers },
        '',
        true
      )

      if (localStorageKey) {
        localStorage.removeItem(localStorageKey)
      }
      if (runtimeCacheKey) {
        sessionStorage.removeItem(runtimeCacheKey)
      }

      if (triggeredByTimeUp) {
        setIsReturningToDashboard(false)
        setIsTimeUpModalOpen(true)
        return
      }

      router.push('/dashboard-home')
    } catch (error) {
      console.error('Failed to submit subtest:', error)

      if (error instanceof ApiFetchError && error.status === 401) {
        router.replace('/login')
        return
      }

      if (isSubtestOutOfOrderError(error)) {
        const payload = getSubtestOutOfOrderPayload(error)
        if (forceSubmit || isTimeUp) {
          if (localStorageKey) {
            localStorage.removeItem(localStorageKey)
          }
          if (runtimeCacheKey) {
            sessionStorage.removeItem(runtimeCacheKey)
          }

          if (triggeredByTimeUp) {
            setIsReturningToDashboard(false)
            setIsTimeUpModalOpen(true)
            return
          }

          router.replace('/dashboard-home')
          return
        }

        const redirected = await redirectToActiveSubtest(payload?.active_subtest)
        if (redirected) {
          return
        }
      }

      if (isTryoutTerminalStateError(error)) {
        if (localStorageKey) {
          localStorage.removeItem(localStorageKey)
        }
        if (runtimeCacheKey) {
          sessionStorage.removeItem(runtimeCacheKey)
        }

        if (triggeredByTimeUp) {
          setIsReturningToDashboard(false)
          setIsTimeUpModalOpen(true)
          return
        }

        router.replace('/dashboard-home')
        return
      }

      if (isCommittedSubmitFallbackError(error)) {
        if (localStorageKey) {
          localStorage.removeItem(localStorageKey)
        }
        if (runtimeCacheKey) {
          sessionStorage.removeItem(runtimeCacheKey)
        }

        if (triggeredByTimeUp) {
          setIsReturningToDashboard(false)
          setIsTimeUpModalOpen(true)
          return
        }

        router.push('/dashboard-home')
        return
      }

      setActionError('Gagal mengirim jawaban akhir. Coba lagi.')
    } finally {
      setIsSubmitting(false)
    }
  }, [
    activeBackendSubtest,
    answers,
    flushDirtyAnswers,
    isSubmitting,
    localStorageKey,
    router,
    redirectToActiveSubtest,
    runtimeCacheKey,
    timeLimit,
    toPayloadAnswerValue,
    unansweredQuestionNumbers.length,
  ])

  const submitAnswersAndLogout = useCallback(async () => {
    if (isLoggingOut) {
      return
    }

    setIsLoggingOut(true)
    setActionError(null)

    try {
      if (activeBackendSubtest) {
        const payloadAnswers: TryoutAnswer[] = Object.values(answers)
          .map((entry) => ({
            kode_soal: entry.kode_soal,
            jawaban: toPayloadAnswerValue(entry),
          }))
          .filter((entry) => entry.jawaban.trim().length > 0)

        await submitSubtest(
          activeBackendSubtest,
          { answers: payloadAnswers },
          '',
          true
        )
      }

      if (localStorageKey) {
        localStorage.removeItem(localStorageKey)
      }
      if (runtimeCacheKey) {
        sessionStorage.removeItem(runtimeCacheKey)
      }
    } catch (error) {
      console.error('Failed to auto-submit before logout:', error)

      const canContinueLogout =
        isSubtestOutOfOrderError(error) ||
        isTryoutTerminalStateError(error) ||
        isCommittedSubmitFallbackError(error)

      if (!canContinueLogout) {
        setActionError(
          'Submit otomatis gagal. Logout tetap dilanjutkan, cek jawaban setelah login kembali.'
        )
      }
    }

    try {
      await logoutAuth()
      window.location.replace('/login')
    } catch (error) {
      setActionError(
        getAuthErrorMessage(error, 'Gagal logout. Silakan coba lagi.')
      )
      setIsLoggingOut(false)
      setIsLogoutModalOpen(true)
    }
  }, [
    activeBackendSubtest,
    answers,
    isLoggingOut,
    localStorageKey,
    runtimeCacheKey,
    toPayloadAnswerValue,
  ])

  useEffect(() => {
    let active = true

    const loadUserProfile = async () => {
      const cachedName = sessionStorage.getItem('tryout_user_name')
      if (cachedName) {
        setUsername(cachedName)
        return
      }

      try {
        const user = await fetchJson<{ username?: string }>(
          `${API_GATEWAY_URL}/api/me`,
          {
            method: 'GET',
          }
        )

        if (!active || !user?.username) {
          return
        }

        setUsername(user.username)
        sessionStorage.setItem('tryout_user_name', user.username)
      } catch {
        // Keep fallback username when profile fetch fails.
      }
    }

    void loadUserProfile()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    const loadQuestions = async () => {
      if (!subtestValid) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setFetchError(null)

      try {
        const requestedBackendSubtest = SUBTEST_TO_BACKEND[subtest]
        const currentTryout = await getCurrentTryout('', true)

        if (!currentTryout?.data?.subtest_sekarang || !currentTryout?.data?.attempt_id) {
          router.replace('/dashboard-home')
          return
        }

        const currentAttemptId = Number(currentTryout.data.attempt_id)
        const activeBackendSubtest = currentTryout.data.subtest_sekarang as string
        const activeSubtestCode = BACKEND_TO_SUBTEST[activeBackendSubtest]
        const runtimeCache = runtimeCacheKey
          ? decodeRuntimeCache(sessionStorage.getItem(runtimeCacheKey))
          : null

        if (!activeSubtestCode) {
          setFetchError('Subtest aktif tidak valid. Coba muat ulang halaman.')
          return
        }

        if (active) {
          setAttemptId(Number.isFinite(currentAttemptId) ? currentAttemptId : null)
          setActiveBackendSubtest(activeBackendSubtest)
        }

        if (requestedBackendSubtest !== activeBackendSubtest) {
          const runtimeCacheLooksCurrent =
            runtimeCache != null &&
            runtimeCache.subtest === subtest &&
            runtimeCache.attemptId === currentAttemptId &&
            runtimeCache.activeBackendSubtest === requestedBackendSubtest

          if (
            runtimeCacheLooksCurrent &&
            hasExpiredTimeLimit(runtimeCache.timeLimitISO)
          ) {
            const requestedAnswerStorageKey =
              Number.isFinite(currentAttemptId)
                ? `tryout_answers_${currentAttemptId}_${requestedBackendSubtest}`
                : null

            showTimeUpModalFallback({
              overrideLocalStorageKey: requestedAnswerStorageKey,
              overrideRuntimeCacheKey: runtimeCacheKey,
            })
            return
          }

          if (runtimeCacheKey) {
            sessionStorage.removeItem(runtimeCacheKey)
          }

          router.replace(getQuestionPath(activeSubtestCode, 1))
          return
        }

        if (runtimeCacheKey) {
          const maxAge = 20 * 60 * 1000
          const stillFresh =
            runtimeCache != null && Date.now() - runtimeCache.updatedAt <= maxAge

          const isRuntimeCacheEligible =
            runtimeCache &&
            stillFresh &&
            runtimeCache.subtest === subtest &&
            runtimeCache.attemptId === currentAttemptId &&
            runtimeCache.activeBackendSubtest === activeBackendSubtest &&
            runtimeCache.questions.length > 0

          if (isRuntimeCacheEligible) {
            const localStorageKeyAtLoad = `tryout_answers_${runtimeCache.attemptId}_${runtimeCache.activeBackendSubtest}`
            const localAnswerMap = decodeStoredAnswers(
              localStorage.getItem(localStorageKeyAtLoad)
            )

            const mergedAnswerMap: LocalAnswerMap = {
              ...runtimeCache.answers,
              ...localAnswerMap,
            }

            if (!active) {
              return
            }

            setTimeLimit(
              runtimeCache.timeLimitISO ? new Date(runtimeCache.timeLimitISO) : null
            )
            setQuestions(runtimeCache.questions)
            setAnswers(mergedAnswerMap)

            localStorage.setItem(
              localStorageKeyAtLoad,
              JSON.stringify(mergedAnswerMap)
            )

            return
          }
        }

        const startData = await startSubtest(activeBackendSubtest, '', true)
        const soalRaw = await getSoal(activeBackendSubtest, '', true)
        const mappedQuestions = mapBackendQuestions(
          Array.isArray(soalRaw) ? soalRaw : [],
          subtest
        )

        const localStorageKeyAtLoad = Number.isFinite(currentAttemptId)
          ? `tryout_answers_${currentAttemptId}_${activeBackendSubtest}`
          : null

        const backendAnswerMap: LocalAnswerMap = {}
        const backendAnswers = Array.isArray(startData?.data?.answers)
          ? startData.data.answers
          : []

        const mappedQuestionsById = new Map<string, TryoutQuestion>()
        mappedQuestions.forEach((item) => {
          mappedQuestionsById.set(item.id, item)
        })

        backendAnswers.forEach((entry: { kode_soal?: string; jawaban?: string }) => {
          const kodeSoal = entry?.kode_soal
          if (!kodeSoal) {
            return
          }

          const questionMeta = mappedQuestionsById.get(kodeSoal)
          const rawJawaban = String(entry?.jawaban || '')
          let normalizedJawaban = rawJawaban

          if (questionMeta?.type === 'multiple_true_false') {
            const statementIds = (questionMeta.statements || []).map(
              (statement) => statement.id
            )
            const parsedSelection = parseTrueFalseSelection(rawJawaban)

            if (statementIds.length === 1) {
              const statementId = statementIds[0]
              const selectedFromSelection = parsedSelection[statementId]
              const selectedFromBool = parseLooseBooleanValue(rawJawaban)
              const selected = selectedFromSelection || selectedFromBool

              normalizedJawaban = selected
                ? serializeTrueFalseSelection({ [statementId]: selected })
                : ''
            } else {
              normalizedJawaban = serializeTrueFalseSelection(parsedSelection)
            }
          }

          backendAnswerMap[kodeSoal] = {
            kode_soal: kodeSoal,
            jawaban: normalizedJawaban,
            synced: true,
            updatedAt: Date.now(),
          }
        })

        const localAnswerMap = localStorageKeyAtLoad
          ? decodeStoredAnswers(localStorage.getItem(localStorageKeyAtLoad))
          : {}

        const mergedAnswerMap: LocalAnswerMap = {
          ...backendAnswerMap,
          ...localAnswerMap,
        }

        if (!active) {
          return
        }

        setTimeLimit(new Date(startData.data.time_limit))
        setQuestions(mappedQuestions)
        setAnswers(mergedAnswerMap)

        if (localStorageKeyAtLoad) {
          localStorage.setItem(localStorageKeyAtLoad, JSON.stringify(mergedAnswerMap))
        }

        if (runtimeCacheKey) {
          sessionStorage.setItem(
            runtimeCacheKey,
            JSON.stringify({
              subtest: subtest as SubtestCode,
              attemptId: currentAttemptId,
              activeBackendSubtest,
              timeLimitISO: startData.data.time_limit,
              questions: mappedQuestions,
              answers: mergedAnswerMap,
              updatedAt: Date.now(),
            } satisfies RuntimeCachePayload)
          )
        }
      } catch (error) {
        if (!active) {
          return
        }

        if (error instanceof ApiFetchError && error.status === 401) {
          router.replace('/login')
          return
        }

        if (error instanceof ApiFetchError && error.status === 429) {
          setFetchError('Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.')
          return
        }

        if (isTryoutTerminalStateError(error)) {
          router.replace('/dashboard-home')
          return
        }

        if (isSubtestOutOfOrderError(error)) {
          const payload = getSubtestOutOfOrderPayload(error)
          const redirected = await redirectToActiveSubtest(payload?.active_subtest)
          if (redirected) {
            return
          }

          if (hasExpiredTimeLimit(timeLimitRef.current)) {
            showTimeUpModalFallback()
            return
          }
        }

        console.error('Failed to load backend questions:', error)
        setFetchError('Gagal memuat soal dari server.')
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    loadQuestions()

    return () => {
      active = false
    }
  }, [router, runtimeCacheKey, showTimeUpModalFallback, subtest, subtestValid])

  useEffect(() => {
    if (!timeLimit) {
      return
    }

    const tick = () => {
      const diffSeconds = Math.floor((timeLimit.getTime() - Date.now()) / 1000)
      const clamped = Math.max(0, diffSeconds)
      setRemainingSeconds(clamped)
      setTimeRemaining(formatTime(clamped))
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [timeLimit])

  useEffect(() => {
    autoSubmitTriggeredRef.current = false
  }, [activeBackendSubtest, timeLimit])

  useEffect(() => {
    if (!activeBackendSubtest || !timeLimit || isSubmitting) {
      return
    }

    const hasExpired = Date.now() >= timeLimit.getTime()
    if (!hasExpired || remainingSeconds > 0) {
      return
    }

    if (autoSubmitTriggeredRef.current) {
      return
    }

    autoSubmitTriggeredRef.current = true
    setActionError('Waktu habis. Jawaban akan dikirim otomatis.')
    void submitCurrentSubtest({ forceSubmit: true, triggeredByTimeUp: true })
  }, [
    activeBackendSubtest,
    isSubmitting,
    remainingSeconds,
    submitCurrentSubtest,
    timeLimit,
  ])

  useEffect(() => {
    if (!runtimeCacheKey || !attemptId || !activeBackendSubtest || questions.length === 0) {
      return
    }

    sessionStorage.setItem(
      runtimeCacheKey,
      JSON.stringify({
        subtest: subtest as SubtestCode,
        attemptId,
        activeBackendSubtest,
        timeLimitISO: timeLimit ? timeLimit.toISOString() : null,
        questions,
        answers,
        updatedAt: Date.now(),
      } satisfies RuntimeCachePayload)
    )
  }, [
    activeBackendSubtest,
    answers,
    attemptId,
    questions,
    runtimeCacheKey,
    subtest,
    timeLimit,
  ])

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 400)
    }

    // Set initial value
    setIsSmallScreen(window.innerWidth < 400)

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!activeBackendSubtest) {
      return
    }

    const hasDirtyAnswers = Object.values(answers).some((entry) => !entry.synced)
    if (!hasDirtyAnswers) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void flushDirtyAnswers(false)
    }, 4000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [activeBackendSubtest, answers, flushDirtyAnswers])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void flushDirtyAnswers(true)
      }
    }

    const onPageHide = () => {
      void flushDirtyAnswers(true)
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', onPageHide)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [flushDirtyAnswers])

  if (!subtestValid) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-white p-6'>
        <div className='w-full max-w-[520px] rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-center text-neutral-700'>
          Subtest tidak ditemukan.
        </div>
      </div>
    )
  }

  const renderSidebarContent = () => (
    <div className='flex h-full flex-col gap-6'>
      <div className={`rounded-lg bg-white p-6 ${cardShadow}`}>
        <p className='text-[16px] font-bold text-neutral-900'>
          {username}
        </p>
      </div>

      <div className={`mt-1 rounded-lg bg-white p-4 ${cardShadow}`}>
        <h2 className='text-[16px] font-bold text-neutral-900'>Daftar Soal</h2>

        <div className='mt-4 grid grid-cols-4 gap-2'>
          {Array.from({ length: totalQuestions }, (_, index) => {
            const number = index + 1
            const isActive = number === questionNumber
            const targetQuestion = questions[number - 1]
            const answerState = targetQuestion
              ? getQuestionAnswerState(
                  targetQuestion,
                  answers[targetQuestion.id]?.jawaban || ''
                )
              : 'empty'

            return (
              <button
                key={`${subtest}-${number}`}
                type='button'
                onClick={() => void navigateToQuestion(number)}
                className={`${numberButtonBase} ${
                  isActive
                    ? 'border-[#0D3388] bg-[#0D3388] text-white'
                    : answerState === 'complete'
                      ? 'border-primary-300 bg-primary-300 text-neutral-900 hover:bg-primary-300'
                      : answerState === 'partial'
                        ? 'border-yellow-200 bg-yellow-100 text-neutral-900 hover:bg-yellow-100'
                    : 'border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100'
                }`}
              >
                {number}
              </button>
            )
          })}
        </div>
      </div>

      <button
        type='button'
        disabled={isLoggingOut}
        onClick={() => setIsLogoutModalOpen(true)}
        className='mt-auto flex w-full items-center justify-center gap-2 rounded-lg border border-[#FB3748] bg-white py-[10px] text-[16px] font-bold text-[#FB3748] transition-colors hover:bg-[#FB3748]/10'
      >
        <LogOut size={18} />
        Log Out
      </button>
    </div>
  )

  if (questionNumber < 1 || questionNumber > totalQuestions) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-white p-6'>
        <div className='w-full max-w-[520px] rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-center'>
          <p className='text-neutral-700'>Nomor soal tidak valid.</p>
          <button
            type='button'
            onClick={() => router.push(getQuestionPath(subtest as SubtestCode, 1))}
            className='bg-primary-600 hover:bg-primary-700 mt-4 rounded-lg px-4 py-2 text-white'
          >
            Kembali ke Soal 1
          </button>
        </div>
      </div>
    )
  }

  const renderMultipleChoice = () => {
    if (!question?.options || question.options.length === 0) {
      return null
    }

    const options = question.options
    const currentValue = answers[question.id]?.jawaban || ''
    const requiredSelections = getRequiredMultipleChoiceSelections(question)
    const isMultiSelect = requiredSelections > 1
    const selectedSet = parseAnswerTokenSet(currentValue)
    const selectedCount = selectedSet.size

    const toggleOptionSelection = (optionId: string) => {
      if (!isMultiSelect) {
        setAnswerValue(question.id, optionId)
        return
      }

      const nextSelection = new Set(selectedSet)

      if (nextSelection.has(optionId)) {
        nextSelection.delete(optionId)
      } else {
        if (nextSelection.size >= requiredSelections) {
          return
        }
        nextSelection.add(optionId)
      }

      const serialized = options
        .map((option) => option.id)
        .filter((id) => nextSelection.has(id))
        .join(',')

      setAnswerValue(question.id, serialized)
    }

    return (
      <section className='rounded-lg border border-neutral-200 bg-white'>
        <div className='rounded-t-lg bg-slate-100 px-[14px] py-[14px] text-[13px] font-bold text-neutral-900 md:text-[15px]'>
          {isMultiSelect
            ? `Pilih ${requiredSelections} jawaban yang benar!`
            : 'Pilih satu jawaban yang benar!'}
          {isMultiSelect && (
            <p className='mt-1 text-[12px] font-medium text-neutral-600'>
              Terpilih {Math.min(selectedCount, requiredSelections)}/{requiredSelections}
            </p>
          )}
        </div>

        <div className='divide-y divide-neutral-200 px-[14px]'>
          {options.map((option) => {
            const checked = isMultiSelect
              ? selectedSet.has(option.id)
              : currentValue === option.id

            return (
              <label
                key={option.id}
                className='flex cursor-pointer items-center gap-3 py-4 text-[13px] text-neutral-800 md:text-[15px]'
              >
                <span
                  className={`flex size-5 items-center justify-center border-2 ${
                    isMultiSelect ? 'rounded-[4px]' : 'rounded-full'
                  } ${
                    checked
                      ? 'border-[#0D3388] bg-[#0D3388]'
                      : 'border-neutral-300 bg-white'
                  }`}
                >
                  <input
                    type={isMultiSelect ? 'checkbox' : 'radio'}
                    checked={checked}
                    onChange={() => toggleOptionSelection(option.id)}
                    className='sr-only'
                  />
                  {isMultiSelect && checked && <Check size={12} className='text-white' />}
                </span>
                <RichTextContent
                  content={option.label}
                  className='text-[13px] text-neutral-800 md:text-[15px]'
                />
              </label>
            )
          })}
        </div>
      </section>
    )
  }

  const renderMultipleTrueFalse = () => {
    if (!question?.statements) {
      return null
    }

    const statements = question.statements
    const selection = parseTrueFalseSelection(answers[question.id]?.jawaban)

    return (
      <section className='rounded-lg border border-neutral-200 bg-white'>
        <div className='rounded-t-lg bg-slate-100 px-[14px] py-[14px] text-[13px] font-bold text-neutral-900 md:text-[15px]'>
          Tentukan kebenaran pernyataan berikut!
        </div>

        <div className=''>
          <table className='w-full table-fixed border-collapse text-[13px] md:text-[14px]'>
            <thead>
              <tr>
                <th className='border-b border-neutral-200 px-3 py-2 text-left font-bold'>
                  Pernyataan
                </th>
                <th className='w-20 border-b border-neutral-200 px-3 py-2 text-center font-bold'>
                  Benar
                </th>
                <th className='w-20 border-b border-neutral-200 px-3 py-2 text-center font-bold'>
                  Salah
                </th>
              </tr>
            </thead>
            <tbody>
              {statements.map((statement, index) => {
                const rowIndex = index + 1
                const chosen = selection[statement.id]
                const isLastRow = index === statements.length - 1

                const updateSelection = (value: 'true' | 'false') => {
                  const nextSelection: TrueFalseSelection = {
                    ...selection,
                    [statement.id]: value,
                  }

                  setAnswerValue(
                    question.id,
                    serializeTrueFalseSelection(nextSelection)
                  )
                }

                return (
                  <tr key={`${question.id}-statement-${rowIndex}`}>
                    <td
                      className={`${
                        isLastRow ? '' : 'border-b border-neutral-200'
                      } px-3 py-3 break-words whitespace-normal text-neutral-800`}
                    >
                      <RichTextContent content={statement.text} className='text-[13px] md:text-[14px]' />
                    </td>
                    <td
                      className={`${
                        isLastRow ? '' : 'border-b border-neutral-200'
                      } px-3 py-3 text-center`}
                    >
                      <input
                        type='radio'
                        name={`statement-${rowIndex}`}
                        checked={chosen === 'true'}
                        onChange={() => updateSelection('true')}
                        className='size-4 accent-[#0D3388]'
                      />
                    </td>
                    <td
                      className={`${
                        isLastRow ? '' : 'border-b border-neutral-200'
                      } px-3 py-3 text-center`}
                    >
                      <input
                        type='radio'
                        name={`statement-${rowIndex}`}
                        checked={chosen === 'false'}
                        onChange={() => updateSelection('false')}
                        className='size-4 accent-[#0D3388]'
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  const renderShortAnswer = () => (
    <section className='rounded-lg border border-neutral-200 bg-white'>
      <div className='rounded-t-lg bg-slate-100 px-[14px] py-[14px] text-[13px] font-bold text-neutral-900 md:text-[15px]'>
        Masukkan jawaban singkat!
      </div>

      <div className='p-[14px]'>
        <textarea
          value={question ? answers[question.id]?.jawaban || '' : ''}
          onChange={(event) =>
            question && setAnswerValue(question.id, event.target.value)
          }
          rows={8}
          placeholder='Ketik jawabanmu disini'
          className='focus:border-primary-300 w-full rounded-lg border border-neutral-200 bg-white p-[18px] text-[13px] text-neutral-900 placeholder:text-neutral-500 focus:outline-none md:text-[15px]'
        />
      </div>
    </section>
  )

  const renderAnswerInput = () => {
    if (!question) {
      return null
    }

    if (question.type === 'multiple_choice') {
      return renderMultipleChoice()
    }

    if (question.type === 'multiple_true_false') {
      return renderMultipleTrueFalse()
    }

    return renderShortAnswer()
  }

  const renderActions = () => {
    const isFirst = questionNumber === 1
    const isLast = questionNumber === totalQuestions
    const showSideBySideNavigation = !isFirst

    return (
      <section className='rounded-lg bg-white p-[14px] shadow-md'>
        <div
          className={`flex items-center gap-3 ${
            showSideBySideNavigation ? '' : 'flex-wrap'
          }`}
        >
          {!isFirst && (
            <button
              type='button'
              onClick={() => void navigateToQuestion(questionNumber - 1)}
              className={`${actionButtonOutline} ${
                showSideBySideNavigation ? 'flex-1' : 'w-full'
              }`}
            >
              <ArrowLeft size={18} />
              Sebelumnya
            </button>
          )}

          {!isLast ? (
            <button
              type='button'
              onClick={() => void navigateToQuestion(questionNumber + 1)}
              className={`${actionButtonSolid} ${
                showSideBySideNavigation ? 'flex-1' : 'w-full'
              }`}
            >
              Selanjutnya
              <ArrowRight size={18} />
            </button>
          ) : (
            <button
              type='button'
              disabled={isSubmitting}
              onClick={() => void submitCurrentSubtest()}
              className={`flex items-center justify-center gap-2 rounded-lg border border-emerald-600 bg-emerald-600 px-4 py-[10px] text-[14px] font-bold text-white transition-colors hover:bg-emerald-700 md:text-[16px] ${
                showSideBySideNavigation ? 'flex-1' : 'w-full'
              }`}
            >
              <Flag size={18} />
              {isSubmitting ? 'Mengirim...' : 'Finish Attempt'}
            </button>
          )}
        </div>

        {(syncStatus !== 'idle' || actionError) && (
          <div className='mt-3 text-[12px]'>
            {syncStatus === 'syncing' && (
              <p className='text-neutral-600'>Menyimpan jawaban...</p>
            )}
            {syncStatus === 'error' && (
              <p className='text-error-300'>Sinkronisasi otomatis gagal. Jawaban tetap tersimpan lokal.</p>
            )}
            {actionError && <p className='text-error-300'>{actionError}</p>}
          </div>
        )}
      </section>
    )
  }

  return (
    <>
      <AlertDialog open={isIncompleteModalOpen} onOpenChange={setIsIncompleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Masih Ada Soal Yang Belum Dijawab</AlertDialogTitle>
            <AlertDialogDescription>
              Kamu masih punya {unansweredQuestionNumbers.length} soal kosong.
              Selesaikan dulu semua soal sebelum finish attempt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='flex-row items-center justify-center gap-3'>
            <AlertDialogCancel className='mt-0 border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100 hover:text-neutral-900'>
              Lanjut Kerjakan
            </AlertDialogCancel>
            <AlertDialogAction
              className='border-primary-600 bg-primary-600 text-white hover:bg-primary-700 hover:text-white'
              onClick={() => {
                if (firstUnansweredQuestionNumber != null) {
                  void navigateToQuestion(firstUnansweredQuestionNumber)
                }
              }}
            >
              Ke Soal Belum Dijawab
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isLogoutModalOpen}
        onOpenChange={(open) => {
          if (!isLoggingOut) {
            setIsLogoutModalOpen(open)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Keluar dari akun?</AlertDialogTitle>
            <AlertDialogDescription>
              Jawaban pada subtest ini akan otomatis disubmit. Setelah itu kamu
              akan logout dan diarahkan ke halaman login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='flex-row justify-center'>
            <AlertDialogCancel disabled={isLoggingOut}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={isLoggingOut}
              className='border border-red-300 bg-white text-red-600 hover:bg-red-50 hover:text-red-600'
              onClick={() => {
                void submitAnswersAndLogout()
              }}
            >
              {isLoggingOut ? 'Memproses...' : 'Submit & Logout'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isTimeUpModalOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsTimeUpModalOpen(true)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Waktu Subtest Sudah Habis</AlertDialogTitle>
            <AlertDialogDescription>
              Waktu pengerjaan telah berakhir dan jawaban kamu sudah dikirim.
              Klik tombol di bawah untuk kembali ke dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='flex-row justify-center'>
            <AlertDialogAction
              disabled={isReturningToDashboard}
              className='border border-primary-600 bg-primary-600 text-white hover:bg-primary-700 hover:text-white'
              onClick={returnToDashboardAfterTimeUp}
            >
              {isReturningToDashboard
                ? 'Mengalihkan...'
                : 'Kembali ke Dashboard'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className='h-screen bg-white lg:flex'>
      {isMobileSidebarOpen && (
        <div className='fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-2 lg:hidden'>
          <div
            className='absolute inset-0'
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div
            className='relative w-full rounded-lg bg-[#F5F7FB] shadow-lg'
            style={{
              boxShadow:
                '0 2px 4px rgba(0, 0, 0, 0.08), 0 3px 10px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* Wrapper with padding */}
            <div style={{ padding: '20px 10px' }}>
              {/* First row: User name box and close button */}
              <div className='mb-4 flex items-center justify-between gap-3'>
                {/* User name box */}
                <div
                  className='flex flex-1 items-center rounded-lg bg-white px-4 py-[14px]'
                  style={{
                    boxShadow:
                      '0 2px 4px rgba(0, 0, 0, 0.08), 0 3px 10px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <p className='text-[16px] font-bold text-neutral-900'>
                    {username}
                  </p>
                </div>

                {/* Close button box */}
                <button
                  type='button'
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className='flex flex-shrink-0 items-center justify-center rounded-lg border'
                  style={{
                    borderColor: '#0D3388',
                    backgroundColor: 'rgba(13, 51, 136, 0.3)',
                    width: '52px',
                    height: '52px',
                  }}
                  aria-label='Tutup'
                >
                  <X size={20} color='#374151' />
                </button>
              </div>

              {/* Question list section */}
              <div
                className='mb-4 rounded-lg bg-white p-4'
                style={{
                  boxShadow:
                    '0 2px 4px rgba(0, 0, 0, 0.08), 0 3px 10px rgba(0, 0, 0, 0.1)',
                }}
              >
                <h3 className='mb-4 text-[14px] font-bold text-neutral-900'>
                  Daftar Soal
                </h3>
                <div className='grid grid-cols-5 gap-2'>
                  {Array.from({ length: totalQuestions }, (_, index) => {
                    const number = index + 1
                    const isActive = number === questionNumber
                    const targetQuestion = questions[number - 1]
                    const answerState = targetQuestion
                      ? getQuestionAnswerState(
                          targetQuestion,
                          answers[targetQuestion.id]?.jawaban || ''
                        )
                      : 'empty'

                    return (
                      <button
                        key={`${subtest}-${number}`}
                        type='button'
                        onClick={() => void navigateToQuestion(number)}
                        className={`${numberButtonBase} ${
                          isActive
                            ? 'border-[#0D3388] bg-[#0D3388] text-white'
                            : answerState === 'complete'
                              ? 'border-primary-300 bg-primary-300 text-neutral-900 hover:bg-primary-300'
                              : answerState === 'partial'
                                ? 'border-yellow-200 bg-yellow-100 text-neutral-900 hover:bg-yellow-100'
                            : 'border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100'
                        }`}
                      >
                        {number}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Logout button */}
              <button
                type='button'
                disabled={isLoggingOut}
                onClick={() => setIsLogoutModalOpen(true)}
                className='flex w-full items-center justify-center gap-2 rounded-lg border border-[#FB3748] bg-white py-[10px] text-[16px] font-bold text-[#FB3748] transition-colors hover:bg-[#FB3748]/10'
              >
                <LogOut size={18} />
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      <aside className='hidden bg-slate-50 p-[6px] md:p-8 lg:block lg:h-screen lg:w-1/4'>
        {renderSidebarContent()}
      </aside>

      <main className='w-full overflow-y-auto bg-white p-[6px] md:p-6 lg:h-screen lg:w-3/4 lg:p-10'>
        <section className='rounded-xl border border-neutral-200 bg-slate-50 p-[10px] shadow-lg md:p-6'>
          <div className='flex flex-col gap-4 md:gap-6'>
            <header className='flex flex-col gap-3 md:gap-4'>
              {/* First row: Mobile - Nomor, Sisa Waktu, Menu | Desktop - Nomor, Subtest, Sisa Waktu */}
              <div className='flex items-center gap-3 md:gap-4'>
                <div className='flex-shrink-0 rounded-lg border border-neutral-200 bg-white px-[14px] py-[14px] text-[14px] font-bold text-neutral-900 shadow-sm md:text-[16px]'>
                  Nomor {questionNumber}
                </div>

                {/* Desktop only: Subtest in the middle */}
                <div className='hidden flex-1 rounded-lg border border-neutral-200 bg-white px-4 py-[14px] text-center text-[14px] font-bold text-neutral-900 shadow-sm md:block md:text-[16px]'>
                  {currentSubtest.title}
                </div>

                <div className='flex-1 rounded-lg border border-neutral-200 bg-white px-[14px] py-[14px] text-center text-[14px] font-bold text-[#FB3748] shadow-sm md:flex-shrink-0 md:text-[16px]'>
                  {!isSmallScreen && 'Sisa Waktu : '}
                  {timeRemaining}
                </div>

                <button
                  type='button'
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className='flex flex-shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white p-[14px] text-neutral-900 shadow-sm lg:hidden'
                  aria-label='Buka daftar soal'
                >
                  <Menu size={20} />
                </button>
              </div>

              

              {/* Second row: Mobile only - Subtest full width */}
              <div className='w-full rounded-lg border border-neutral-200 bg-white px-4 py-[14px] text-center text-[14px] font-bold text-neutral-900 shadow-sm md:hidden'>
                {currentSubtest.title}
              </div>
            </header>

            <div className='grid grid-cols-1 gap-6 lg:grid-cols-12'>
              <article className='rounded-lg border border-neutral-200 bg-white px-3 py-6 md:p-6 lg:col-span-7'>
                {isLoading ? (
                  <div className='rounded-md bg-neutral-100 p-6 text-center text-neutral-600'>
                    Memuat soal...
                  </div>
                ) : fetchError ? (
                  <div className='rounded-md bg-neutral-100 p-6 text-center text-neutral-600'>
                    {fetchError}
                  </div>
                ) : question ? (
                  <div className='flex flex-col gap-6'>
                    {question.imageUrl && questionDisplay.showTopImage && (
                      <Image
                        src={question.imageUrl}
                        alt={`Gambar soal ${question.number}`}
                        width={900}
                        height={420}
                        className='h-auto max-h-[220px] w-full rounded-lg border border-neutral-200 object-contain'
                        unoptimized
                      />
                    )}
                    <RichTextContent
                      content={questionDisplay.text}
                      className='text-[14px] leading-relaxed text-neutral-800 md:text-[16px]'
                    />
                  </div>
                ) : (
                  <div className='rounded-md bg-neutral-100 p-6 text-center text-neutral-600'>
                    Soal tidak ditemukan.
                  </div>
                )}
              </article>

              <div className='flex flex-col gap-6 lg:col-span-5'>
                {renderAnswerInput()}
                {renderActions()}
              </div>
            </div>
          </div>
        </section>
      </main>
      </div>
    </>
  )
}

export default TryoutQuestionScreen
