package models

import "time"

type MinatBakatAttempt struct {
	AttemptID int       `db:"attempt_id" json:"attempt_id"`
	UserID    int       `db:"user_id" json:"user_id"`
	BakatUser string    `db:"bakat_user" json:"bakat_user"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}

type MinatBakatAttemptHistory struct {
	Items  []MinatBakatAttempt `json:"items"`
	Limit  int                 `json:"limit"`
	Offset int                 `json:"offset"`
	Count  int                 `json:"count"`
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

type MinatBakatRoleProfile struct {
	Slug              string `json:"slug"`
	Title             string `json:"title"`
	FirstDescription  string `json:"first_description"`
	SecondDescription string `json:"second_description"`
}

type MinatBakatResult struct {
	AttemptID         int                   `db:"attempt_id" json:"attempt_id"`
	UserID            int                   `db:"user_id" json:"user_id"`
	DNATop            string                `db:"dna_it_top" json:"dna_it_top"`
	TopRoleSlug       string                `json:"top_role_slug,omitempty"`
	TopRoleTitle      string                `json:"top_role_title,omitempty"`
	TopRoleProfile    MinatBakatRoleProfile `json:"top_role_profile"`
	Confidence        float64               `db:"confidence" json:"confidence"`
	TotalQuestions    int                   `db:"total_questions" json:"total_questions"`
	AssessmentVersion string                `db:"assessment_version" json:"assessment_version"`
	ScoringVersion    string                `db:"scoring_version" json:"scoring_version"`
	DimensionScores   map[string]float64    `json:"dimension_scores"`
	RoleScores        map[string]float64    `json:"role_scores"`
	CreatedAt         time.Time             `db:"created_at" json:"created_at"`
}
