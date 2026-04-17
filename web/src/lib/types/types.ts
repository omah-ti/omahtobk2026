export type SubtestScore = {
  user_id: number
  attempt_id: number
  subtest: string
  score: number
}

export type SubtestsScoreResponse = {
  data: SubtestScore[]
} | null

export type SubtestsProgressRow = {
  order: number
  subtest_key: string
  subtest_name: string
  score_value: number | null
  score_max: number
  score_text: string
  status_label: string
  action_label: string
  action_route: string
  is_current: boolean
  is_locked: boolean
}

export type SubtestsProgressSummary = {
  total_subtests: number
  completed_subtests: number
  current_subtest?: string
  attempt_status: 'not_started' | 'ongoing' | 'finished' | string
}

export type SubtestsProgressResponse = {
  data: {
    summary: SubtestsProgressSummary
    rows: SubtestsProgressRow[]
  }
} | null

export type User = {
  username: string 
  email: string 
  asal_sekolah: string 
  user_id: number | string
} | null

export type Leaderboard = {
  username: string | null
  score: number | null
}
export type LeaderboardResponse = {
  data: Leaderboard[]
} | null

export type ProgressOverviewInsightItem = {
  subtest_key: string
  subtest_name: string
  score: number | null
  score_text: string
}

export type ProgressOverviewUTBK = {
  label: string
  start_at: string
  end_at: string
  server_time: string
}

export type ProgressOverviewResponse = {
  data: {
    profile: {
      user_id: number
      name: string
      school: string
    }
    statistics: {
      average_score: number
      completed_subtests: number
      total_subtests: number
      progress_text: string
    }
    insight: {
      strongest_subtest: ProgressOverviewInsightItem
      focus_subtest: ProgressOverviewInsightItem
    }
    leaderboard: {
      top_n: Array<{
        rank: number
        username: string
        score: number
      }>
      current_user_rank: number | null
      current_user_score: number | null
    }
    utbk: ProgressOverviewUTBK
  }
} | null

export type Jawaban = {
  kode_soal: string
  jawaban: string | null
}
