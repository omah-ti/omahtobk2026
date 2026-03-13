package repositories

import (
	"context"
	"database/sql"
	"encoding/json"
	"minat-bakat-service/internal/logger"
	"minat-bakat-service/internal/models"

	"github.com/jmoiron/sqlx"
)

type MbRepo interface {
	BeginTransaction(c context.Context) (*sqlx.Tx, error)
	GetActiveQuestions(c context.Context) ([]models.MbQuestion, error)
	CreateAttemptTx(c context.Context, tx *sqlx.Tx, userID int, assessmentVersion, scoringVersion string) (int, error)
	SaveAttemptAnswersTx(c context.Context, tx *sqlx.Tx, attemptID int, answers []models.MbAnswerInput, questionByID map[int]models.MbQuestion, questionByCode map[string]models.MbQuestion) error
	SaveResultTx(c context.Context, tx *sqlx.Tx, result *models.MinatBakatResult) error
	GetLatestResultByUserID(c context.Context, userID int) (*models.MinatBakatResult, error)
	UpsertLegacyAttemptTx(c context.Context, tx *sqlx.Tx, userID int, bakatUser string) error
	StoreMinatBakat(c context.Context, attempt *models.MinatBakatAttempt) error
	GetMinatBakatFromUserID(c context.Context, userID int) (*models.MinatBakatAttempt, error)
}

type mbRepo struct {
	db *sqlx.DB
}

func NewMbRepo(db *sqlx.DB) MbRepo {
	return &mbRepo{db: db}
}

func (r *mbRepo) BeginTransaction(c context.Context) (*sqlx.Tx, error) {
	tx, err := r.db.BeginTxx(c, nil)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to begin transaction")
		return nil, err
	}

	return tx, nil
}

func (r *mbRepo) GetActiveQuestions(c context.Context) ([]models.MbQuestion, error) {
	query := `
		SELECT question_id, kode_soal, statement, dimension, reverse_scored, is_active
		FROM mb_questions
		WHERE is_active = TRUE
		ORDER BY question_id ASC
	`

	var questions []models.MbQuestion
	if err := r.db.SelectContext(c, &questions, query); err != nil {
		logger.LogErrorCtx(c, err, "Failed to get active MB questions")
		return nil, err
	}

	return questions, nil
}

func (r *mbRepo) CreateAttemptTx(c context.Context, tx *sqlx.Tx, userID int, assessmentVersion, scoringVersion string) (int, error) {
	query := `
		INSERT INTO mb_attempts (user_id, assessment_version, scoring_version, status, started_at, completed_at)
		VALUES ($1, $2, $3, 'completed', NOW(), NOW())
		RETURNING attempt_id
	`

	var attemptID int
	if err := tx.QueryRowxContext(c, query, userID, assessmentVersion, scoringVersion).Scan(&attemptID); err != nil {
		logger.LogErrorCtx(c, err, "Failed to create MB attempt", map[string]interface{}{"user_id": userID})
		return 0, err
	}

	return attemptID, nil
}

func (r *mbRepo) SaveAttemptAnswersTx(c context.Context, tx *sqlx.Tx, attemptID int, answers []models.MbAnswerInput, questionByID map[int]models.MbQuestion, questionByCode map[string]models.MbQuestion) error {
	query := `
		INSERT INTO mb_attempt_answers (attempt_id, question_id, likert_value, scored_value)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (attempt_id, question_id)
		DO UPDATE SET likert_value = EXCLUDED.likert_value, scored_value = EXCLUDED.scored_value
	`

	for _, ans := range answers {
		var q models.MbQuestion
		if ans.QuestionID != nil {
			question, ok := questionByID[*ans.QuestionID]
			if !ok {
				continue
			}
			q = question
		} else {
			question, ok := questionByCode[ans.KodeSoal]
			if !ok {
				continue
			}
			q = question
		}

		scored := ans.LikertValue
		if q.ReverseScored {
			scored = 6 - ans.LikertValue
		}

		if _, err := tx.ExecContext(c, query, attemptID, q.QuestionID, ans.LikertValue, scored); err != nil {
			logger.LogErrorCtx(c, err, "Failed to save MB attempt answer", map[string]interface{}{"attempt_id": attemptID, "question_id": q.QuestionID})
			return err
		}
	}

	return nil
}

func (r *mbRepo) SaveResultTx(c context.Context, tx *sqlx.Tx, result *models.MinatBakatResult) error {
	dimJSON, err := json.Marshal(result.DimensionScores)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to marshal dimension scores")
		return err
	}

	roleJSON, err := json.Marshal(result.RoleScores)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to marshal role scores")
		return err
	}

	query := `
		INSERT INTO mb_results (
			attempt_id, user_id, dna_it_top, confidence, total_questions,
			assessment_version, scoring_version, dimension_scores, role_scores, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, NOW())
	`

	_, err = tx.ExecContext(
		c,
		query,
		result.AttemptID,
		result.UserID,
		result.DNATop,
		result.Confidence,
		result.TotalQuestions,
		result.AssessmentVersion,
		result.ScoringVersion,
		string(dimJSON),
		string(roleJSON),
	)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to save MB result", map[string]interface{}{"attempt_id": result.AttemptID, "user_id": result.UserID})
		return err
	}

	return nil
}

func (r *mbRepo) UpsertLegacyAttemptTx(c context.Context, tx *sqlx.Tx, userID int, bakatUser string) error {
	query := `
		INSERT INTO minat_bakat_attempt (user_id, bakat_user)
		VALUES ($1, $2)
		ON CONFLICT (user_id)
		DO UPDATE SET bakat_user = EXCLUDED.bakat_user
	`

	if _, err := tx.ExecContext(c, query, userID, bakatUser); err != nil {
		logger.LogErrorCtx(c, err, "Failed to upsert legacy MB attempt", map[string]interface{}{"user_id": userID})
		return err
	}

	return nil
}

func (r *mbRepo) GetLatestResultByUserID(c context.Context, userID int) (*models.MinatBakatResult, error) {
	query := `
		SELECT
			attempt_id, user_id, dna_it_top, confidence, total_questions,
			assessment_version, scoring_version, dimension_scores, role_scores, created_at
		FROM mb_results
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT 1
	`

	var (
		result   models.MinatBakatResult
		dimJSON  []byte
		roleJSON []byte
	)

	err := r.db.QueryRowxContext(c, query, userID).Scan(
		&result.AttemptID,
		&result.UserID,
		&result.DNATop,
		&result.Confidence,
		&result.TotalQuestions,
		&result.AssessmentVersion,
		&result.ScoringVersion,
		&dimJSON,
		&roleJSON,
		&result.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		logger.LogErrorCtx(c, err, "Failed to get latest MB result", map[string]interface{}{"user_id": userID})
		return nil, err
	}

	result.DimensionScores = map[string]float64{}
	if len(dimJSON) > 0 {
		if err := json.Unmarshal(dimJSON, &result.DimensionScores); err != nil {
			logger.LogErrorCtx(c, err, "Failed to unmarshal dimension scores", map[string]interface{}{"user_id": userID})
			return nil, err
		}
	}

	result.RoleScores = map[string]float64{}
	if len(roleJSON) > 0 {
		if err := json.Unmarshal(roleJSON, &result.RoleScores); err != nil {
			logger.LogErrorCtx(c, err, "Failed to unmarshal role scores", map[string]interface{}{"user_id": userID})
			return nil, err
		}
	}

	return &result, nil
}

func (r *mbRepo) StoreMinatBakat(c context.Context, attempt *models.MinatBakatAttempt) error {
	query := `
		INSERT INTO minat_bakat_attempt (user_id, bakat_user)
		VALUES ($1, $2)
		ON CONFLICT (user_id)
		DO UPDATE SET bakat_user = EXCLUDED.bakat_user
	`

	_, err := r.db.ExecContext(c, query, attempt.UserID, attempt.BakatUser)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to store minat bakat attempt")
		return err
	}

	logger.LogDebugCtx(c, "Minat bakat attempt stored successfully")
	return nil
}

func (r *mbRepo) GetMinatBakatFromUserID(c context.Context, userID int) (*models.MinatBakatAttempt, error) {
	query := `
		SELECT user_id, bakat_user
		FROM minat_bakat_attempt
		WHERE user_id = $1
	`

	var attempt models.MinatBakatAttempt
	err := r.db.Get(&attempt, query, userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		logger.LogErrorCtx(c, err, "Failed to get minat bakat from user id", map[string]interface{}{"user_id": userID})
		return nil, err
	}

	return &attempt, nil
}
