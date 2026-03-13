package models

import "time"

type MinatBakatAttempt struct {
	UserID    int    `db:"user_id" json:"user_id"`
	BakatUser string `db:"bakat_user" json:"bakat_user"`
}

// Legacy payload format kept for backward compatibility.
type MinatBakatAnswers struct {
	KodeSoal string `json:"kode_soal"`
	Jawaban  string `json:"jawaban"`
}

type MbQuestion struct {
	QuestionID    int    `db:"question_id" json:"question_id"`
	KodeSoal      string `db:"kode_soal" json:"kode_soal"`
	Statement     string `db:"statement" json:"statement"`
	Dimension     string `db:"dimension" json:"dimension"`
	ReverseScored bool   `db:"reverse_scored" json:"reverse_scored"`
	IsActive      bool   `db:"is_active" json:"is_active"`
}

type MbAnswerInput struct {
	QuestionID  *int   `json:"question_id,omitempty"`
	KodeSoal    string `json:"kode_soal,omitempty"`
	LikertValue int    `json:"likert_value" binding:"required,min=1,max=5"`
}

type SubmitMinatBakatRequest struct {
	AssessmentVersion string          `json:"assessment_version,omitempty"`
	Answers           []MbAnswerInput `json:"answers" binding:"required,min=1,dive"`
}

type MinatBakatResult struct {
	AttemptID         int                `db:"attempt_id" json:"attempt_id"`
	UserID            int                `db:"user_id" json:"user_id"`
	DNATop            string             `db:"dna_it_top" json:"dna_it_top"`
	Confidence        float64            `db:"confidence" json:"confidence"`
	TotalQuestions    int                `db:"total_questions" json:"total_questions"`
	AssessmentVersion string             `db:"assessment_version" json:"assessment_version"`
	ScoringVersion    string             `db:"scoring_version" json:"scoring_version"`
	DimensionScores   map[string]float64 `json:"dimension_scores"`
	RoleScores        map[string]float64 `json:"role_scores"`
	CreatedAt         time.Time          `db:"created_at" json:"created_at"`
}
