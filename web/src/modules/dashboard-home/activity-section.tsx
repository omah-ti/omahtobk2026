import { FileText } from 'lucide-react'
import Link from 'next/link'

import { SubtestsProgressResponse, SubtestsProgressRow } from '@/lib/types/types'

const SUBTEST_LABELS: Record<string, string> = {
  subtest_pu: 'Kemampuan Penalaran Umum',
  subtest_ppu: 'Pengetahuan dan Pemahaman Umum',
  subtest_pbm: 'Kemampuan Memahami Bacaan dan Menulis',
  subtest_pk: 'Pengetahuan Kuantitatif',
  subtest_lbi: 'Literasi dalam Bahasa Indonesia',
  subtest_lbe: 'Literasi dalam Bahasa Inggris',
  subtest_pm: 'Penalaran Matematika',
}

const SUBTEST_SLUG_ROUTES: Record<string, string> = {
  subtest_pu: '/tryout/penalaran-umum',
  subtest_ppu: '/tryout/pengetahuan-dan-pemahaman-umum',
  subtest_pbm: '/tryout/pemahaman-bacaan-dan-menulis',
  subtest_pk: '/tryout/pengetahuan-kuantitatif',
  subtest_lbi: '/tryout/literasi-bahasa-indonesia',
  subtest_lbe: '/tryout/literasi-bahasa-inggris',
  subtest_pm: '/tryout/penalaran-matematika',
}

const getStatusKey = (statusLabel: string) => {
  const normalized = statusLabel.trim().toLowerCase()

  if (normalized === 'selesai') {
    return 'selesai'
  }

  if (normalized.includes('belum')) {
    return 'belum'
  }

  return 'kerjakan-terakhir'
}

function StatusBadge({ statusLabel }: { statusLabel: string }) {
  const status = getStatusKey(statusLabel)
  const base =
    'inline-flex items-center justify-center px-[14px] py-[9px] rounded-xl border border-neutral-300 text-sm whitespace-nowrap'

  if (status === 'selesai') {
    return <span className={`${base} bg-[rgba(132,235,180,0.5)]`}>Selesai</span>
  }

  if (status === 'belum') {
    return <span className={`${base} bg-white`}>Belum dikerjakan</span>
  }

  return <span className={`${base} bg-white`}>Kerjakan subtest terakhir</span>
}

function MulaiButton({ row }: { row: SubtestsProgressRow }) {
  const status = getStatusKey(row.status_label)
  if (status === 'selesai') {
    return <div />
  }

  const label = row.action_label || 'Mulai Kerjakan'
  const isHighlight = status === 'belum' && !row.is_locked
  const className = `block w-full py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all text-center ${
    isHighlight ? 'bg-[#1A3FA8] text-white' : 'bg-neutral-200 text-[#333]'
  }`

  if (row.is_locked) {
    return (
      <button className={className} disabled>
        {label}
      </button>
    )
  }

  return (
    <Link
      href={SUBTEST_SLUG_ROUTES[row.subtest_key] || row.action_route || '/tryout/penalaran-umum'}
      className={className}
    >
      {label}
    </Link>
  )
}

const getSubtestLabel = (row: SubtestsProgressRow) => {
  return SUBTEST_LABELS[row.subtest_key] || row.subtest_name
}

export default function ActivitySection({
  progress,
}: {
  progress: SubtestsProgressResponse
}) {
  const rows = progress?.data?.rows ?? []

  return (
    <div className='bg-white rounded-2xl overflow-hidden border border-neutral-100'>
      <div className='flex items-center gap-2 px-6 h-16 bg-neutral-200'>
        <FileText size={16} className='text-[#6E97F2]' />
        <span className='font-semibold text-[#333] text-base'>Aktivitas</span>
      </div>

      <div className='grid grid-cols-[1fr_120px_200px_200px] gap-4 px-6 py-3 border-b border-neutral-100 text-sm text-[#333] font-medium'>
        <span>Subtest</span>
        <span>Skor</span>
        <span>Status</span>
        <span>Aksi</span>
      </div>

      {rows.map((row) => (
        <div
          key={row.subtest_key}
          className='grid grid-cols-[1fr_120px_200px_200px] gap-4 items-center px-6 py-4 border-b border-neutral-100 last:border-0'
        >
          <span className='text-sm text-[#333]'>{getSubtestLabel(row)}</span>
          <span className='text-sm text-[#333]'>{row.score_text || '-'}</span>
          <StatusBadge statusLabel={row.status_label} />
          <MulaiButton row={row} />
        </div>
      ))}
    </div>
  )
}