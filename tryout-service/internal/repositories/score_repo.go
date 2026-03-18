package repositories

import (
	"context"
	"tryout-service/internal/logger"
	"tryout-service/internal/models"

	"github.com/jmoiron/sqlx"
)

type ScoreRepo interface {
	BeginTransaction(c context.Context) (*sqlx.Tx, error)
	InsertScoreForUserAttemptIDAndSubtestTx(c context.Context, tx *sqlx.Tx, attemptID, userID int, subtest string, score float64) error // Insert a user's score for a subtest, this will be called after calculating
	GetUserAnswersFromAttemptIDandSubtest(c context.Context, attemptID int, subtest string) ([]models.UserAnswer, error)
	GetUserAnswersFromAttemptIDandSubtestTx(c context.Context, tx *sqlx.Tx, attemptID int, subtest string) ([]models.UserAnswer, error) // Get user's answers for a subtest
	GetUserScoreFromAttemptIDAndSubtestTx(c context.Context, tx *sqlx.Tx, attemptID int, subtest string) (*models.UserScore, error)     // Get user's score for a subtest
	CalculateAverageScoreForAttempt(c context.Context, tx *sqlx.Tx, attemptID int) (float64, error)
	UpdateScoreForTryOutAttempt(c context.Context, tx *sqlx.Tx, attemptID int, avgScore float64) error
}

type scoreRepo struct {
	db *sqlx.DB
}

func NewScoreRepo(db *sqlx.DB) ScoreRepo {
	return &scoreRepo{db: db}
}

func (r *scoreRepo) BeginTransaction(c context.Context) (*sqlx.Tx, error) {
	tx, err := r.db.Beginx()
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to begin transaction")
		return nil, err
	}
	logger.LogDebugCtx(c, "Transaction started successfully")
	return tx, nil
}

func (r *scoreRepo) InsertScoreForUserAttemptIDAndSubtestTx(c context.Context, tx *sqlx.Tx, attemptID, userID int, subtest string, score float64) error {
	query := `
		INSERT INTO user_scores (attempt_id, user_id, subtest, score)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (user_id, attempt_id, subtest)
		DO UPDATE SET score = EXCLUDED.score
	`

	_, err := tx.Exec(query, attemptID, userID, subtest, score)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to insert user score", map[string]interface{}{
			"attempt_id": attemptID,
			"user_id":    userID,
			"subtest":    subtest,
			"score":      score,
		})
		return err
	}

	logger.LogDebugCtx(c, "User score inserted successfully", map[string]interface{}{
		"attempt_id": attemptID,
		"user_id":    userID,
		"subtest":    subtest,
		"score":      score,
	})
	return nil
}

func (r *scoreRepo) GetUserAnswersFromAttemptIDandSubtest(c context.Context, attemptID int, subtest string) ([]models.UserAnswer, error) {
	var userAnswers []models.UserAnswer

	query := `SELECT attempt_id, subtest, kode_soal, jawaban FROM user_answers WHERE attempt_id = $1 AND subtest = $2`
	err := r.db.Select(&userAnswers, query, attemptID, subtest)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to fetch user answers", map[string]interface{}{
			"attemptID": attemptID,
			"subtest":   subtest,
		})
		return nil, err
	}

	logger.LogDebugCtx(c, "Fetched user answers", map[string]interface{}{
		"attemptID":   attemptID,
		"subtest":     subtest,
		"answerCount": len(userAnswers),
	})

	return userAnswers, nil
}

func (r *scoreRepo) GetUserAnswersFromAttemptIDandSubtestTx(c context.Context, tx *sqlx.Tx, attemptID int, subtest string) ([]models.UserAnswer, error) {
	var userAnswers []models.UserAnswer

	query := `SELECT attempt_id, subtest, kode_soal, jawaban FROM user_answers WHERE attempt_id = $1 AND subtest = $2`

	err := tx.Select(&userAnswers, query, attemptID, subtest)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to fetch user answers", map[string]interface{}{
			"attemptID": attemptID,
			"subtest":   subtest,
		})
		return nil, err
	}

	logger.LogDebugCtx(c, "Fetched user answers", map[string]interface{}{
		"attemptID":   attemptID,
		"subtest":     subtest,
		"answerCount": len(userAnswers),
	})

	return userAnswers, nil
}

func (r *scoreRepo) GetUserScoreFromAttemptIDAndSubtestTx(c context.Context, tx *sqlx.Tx, attemptID int, subtest string) (*models.UserScore, error) {
	query := `
		SELECT score
		FROM user_scores
		WHERE attempt_id = $1 AND subtest = $2
	`

	var userScore models.UserScore
	err := tx.Get(&userScore, query, attemptID, subtest)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get user score", map[string]interface{}{
			"attemptID": attemptID,
			"subtest":   subtest,
		})
		return nil, err
	}

	logger.LogDebugCtx(c, "Fetched user score", map[string]interface{}{
		"attemptID": attemptID,
		"subtest":   subtest,
		"score":     userScore.Score,
	})
	return &userScore, nil
}

func (r *scoreRepo) CalculateAverageScoreForAttempt(c context.Context, tx *sqlx.Tx, attemptID int) (float64, error) {
	var avgScore float64
	query := `SELECT AVG(score) FROM user_scores WHERE attempt_id = $1`
	err := tx.Get(&avgScore, query, attemptID)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to calculate average score", map[string]interface{}{
			"attemptID": attemptID,
		})
		return 0, err
	}
	return avgScore, nil
}

func (r *scoreRepo) UpdateScoreForTryOutAttempt(c context.Context, tx *sqlx.Tx, attemptID int, avgScore float64) error {
	query := `UPDATE tryout_attempt SET tryout_score = $1 WHERE attempt_id = $2`
	_, err := tx.Exec(query, avgScore, attemptID)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to update score for tryout attempt", map[string]interface{}{
			"attemptID": attemptID,
			"avgScore":  avgScore,
		})
		return err
	}
	return nil
}
