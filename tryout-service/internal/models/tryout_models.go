package models

import "time"

type TryoutAttempt struct {
	TryoutAttemptID int          `db:"attempt_id" json:"attempt_id" binding:"required"`
	Paket           string       `db:"paket" json:"paket" binding:"required"`
	Status          string       `db:"status" json:"status" binding:"required"`
	Username        string       `db:"username" json:"username" binding:"required"`
	UserID          int          `db:"user_id" json:"user_id" binding:"required"`
	StartTime       time.Time    `db:"start_time" json:"start_time" binding:"required"`
	EndTime         *time.Time   `db:"end_time" json:"end_time"`
	TryoutScore     *float64     `db:"tryout_score" json:"tryout_score"`
	SubtestSekarang string       `db:"subtest_sekarang" json:"subtest_sekarang"` // supaya mudah untuk join dengan tabel answer, nanti where subtest = subtest_sekarang
	UserAnswers     []UserAnswer `json:"user_answers"`
}

type UserAnswer struct {
	TryoutAttemptID int    `db:"attempt_id" json:"attempt_id" binding:"required"`
	Subtest         string `db:"subtest" json:"subtest" binding:"required"`
	KodeSoal        string `db:"kode_soal" json:"kode_soal" binding:"required"`
	Jawaban         string `db:"jawaban" json:"jawaban" binding:"required"`
}

type UserScore struct {
	UserID          int     `db:"user_id" json:"user_id" binding:"required"`
	TryoutAttemptID int     `db:"attempt_id" json:"attempt_id" binding:"required"`
	Subtest         string  `db:"subtest" json:"subtest" binding:"required"`
	Score           float64 `db:"score" json:"score" binding:"required"`
}

type TimeLimit struct {
	TimeLimitID     int    `db:"time_limit_id" json:"time_limit_id" binding:"required"`
	TryoutAttemptID int    `db:"attempt_id" json:"attempt_id" binding:"required"`
	Subtest         string `db:"subtest" json:"subtest" binding:"required"`
	TimeLimit       int    `db:"time_limit" json:"time_limit" binding:"required"`
}
type AnswerPayload struct {
	KodeSoal string  `json:"kode_soal" binding:"required"`
	Jawaban  *string `json:"jawaban" binding:"omitempty"`
}

type AnswerKeys struct {
	PilihanGandaAnswers map[string]map[string]struct { // Now groups by KodeSoal
		IsCorrect   bool
		Bobot       int
		TextPilihan string
	} `json:"pilihan_ganda,omitempty"`

	TrueFalseAnswers map[string]struct { // Now groups by KodeSoal
		Jawaban     string
		Bobot       int
		TextPilihan string
	} `json:"true_false,omitempty"`

	UraianAnswers map[string]struct { // Now groups by KodeSoal
		Jawaban string
		Bobot   int
	} `json:"uraian,omitempty"`
}

type EnrichedUserAnswer struct {
	AttemptID   int    `json:"attempt_id"`
	Subtest     string `json:"subtest"`
	KodeSoal    string `json:"kode_soal"`
	UserAnswer  string `json:"user_answer"`
	IsCorrect   bool   `json:"is_correct"`
	Bobot       int    `json:"bobot"`
	TextPilihan string `json:"text_pilihan,omitempty"` // Only for MCQ/True-False
}

type SubtestProgressRow struct {
	Order       int      `json:"order"`
	SubtestKey  string   `json:"subtest_key"`
	SubtestName string   `json:"subtest_name"`
	ScoreValue  *float64 `json:"score_value"`
	ScoreMax    int      `json:"score_max"`
	ScoreText   string   `json:"score_text"`
	StatusLabel string   `json:"status_label"`
	ActionLabel string   `json:"action_label"`
	ActionRoute string   `json:"action_route"`
	IsCurrent   bool     `json:"is_current"`
	IsLocked    bool     `json:"is_locked"`
}

type SubtestsProgressSummary struct {
	TotalSubtests     int    `json:"total_subtests"`
	CompletedSubtests int    `json:"completed_subtests"`
	CurrentSubtest    string `json:"current_subtest,omitempty"`
	AttemptStatus     string `json:"attempt_status"`
}

type SubtestsProgressResponse struct {
	Summary SubtestsProgressSummary `json:"summary"`
	Rows    []SubtestProgressRow    `json:"rows"`
}

type ProgressOverviewProfile struct {
	UserID int    `json:"user_id"`
	Name   string `json:"name"`
	School string `json:"school"`
}

type ProgressOverviewStatistics struct {
	AverageScore      float64 `json:"average_score"`
	CompletedSubtests int     `json:"completed_subtests"`
	TotalSubtests     int     `json:"total_subtests"`
	ProgressText      string  `json:"progress_text"`
}

type ProgressOverviewInsightItem struct {
	SubtestKey  string   `json:"subtest_key"`
	SubtestName string   `json:"subtest_name"`
	Score       *float64 `json:"score"`
	ScoreText   string   `json:"score_text"`
}

type ProgressOverviewInsight struct {
	StrongestSubtest ProgressOverviewInsightItem `json:"strongest_subtest"`
	FocusSubtest     ProgressOverviewInsightItem `json:"focus_subtest"`
}

type ProgressOverviewLeaderboardEntry struct {
	Rank     int     `json:"rank"`
	Username string  `json:"username"`
	Score    float64 `json:"score"`
}

type ProgressOverviewLeaderboard struct {
	TopN             []ProgressOverviewLeaderboardEntry `json:"top_n"`
	CurrentUserRank  *int                               `json:"current_user_rank"`
	CurrentUserScore *float64                           `json:"current_user_score"`
}

type ProgressOverviewUTBK struct {
	Label      string    `json:"label"`
	StartAt    time.Time `json:"start_at"`
	EndAt      time.Time `json:"end_at"`
	ServerTime time.Time `json:"server_time"`
}

type ProgressOverviewResponse struct {
	Profile     ProgressOverviewProfile     `json:"profile"`
	Statistics  ProgressOverviewStatistics  `json:"statistics"`
	Insight     ProgressOverviewInsight     `json:"insight"`
	Leaderboard ProgressOverviewLeaderboard `json:"leaderboard"`
	UTBK        ProgressOverviewUTBK        `json:"utbk"`
}
