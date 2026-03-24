package repositories

import (
	"context"
	"tryout-service/internal/logger"
	"tryout-service/internal/models"

	"github.com/jmoiron/sqlx"
)

type PageRepo interface {
	GetAllSubtestScoreForAUser(c context.Context, userID int) ([]models.UserScore, error)
	GetTop4Leaderboard(c context.Context) ([]models.TryoutAttempt, error) // /leaderboard
	GetScoreAndRank(c context.Context, userID int, paket string) (float64, int, error)
	GetUserAnswersBasedOnIDPaketAndSubtest(c context.Context, userID int, paket, subtest string) ([]models.UserAnswer, error)
	GetOngoingAttemptByUserID(c context.Context, userID int) (*models.TryoutAttempt, error)
	GetFinishedAttemptByUserID(c context.Context, userID int) (*models.TryoutAttempt, error)
}

type pageRepo struct {
	db *sqlx.DB
}

func NewPageRepo(db *sqlx.DB) PageRepo {
	return &pageRepo{db: db}
}

// Query helper for score summary shown in progress/result pages.
func (r *pageRepo) GetAllSubtestScoreForAUser(c context.Context, userID int) ([]models.UserScore, error) {
	var scores []models.UserScore
	query := `
		SELECT user_id, attempt_id, score, subtest
		FROM user_scores
		WHERE user_id = $1
		ORDER BY CASE subtest
			WHEN 'subtest_pu' THEN 1
			WHEN 'subtest_ppu' THEN 2
			WHEN 'subtest_pbm' THEN 3
			WHEN 'subtest_pk' THEN 4
			WHEN 'subtest_lbi' THEN 5
			WHEN 'subtest_lbe' THEN 6
			WHEN 'subtest_pm' THEN 7
			ELSE 99
		END
	`
	err := r.db.Select(&scores, query, userID)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get all subtest scores for user", map[string]interface{}{"user_id": userID})
		return nil, err
	}
	return scores, nil
}

// tryout homepage
func (r *pageRepo) GetTop4Leaderboard(c context.Context) ([]models.TryoutAttempt, error) {
	var leaderboards []models.TryoutAttempt
	query := `SELECT user_id, username, tryout_score FROM tryout_attempt WHERE status = 'finished' ORDER BY tryout_score DESC LIMIT 4`
	err := r.db.Select(&leaderboards, query)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get top 4 leaderboard")
		return nil, err
	}
	return leaderboards, nil
}

// Query helper for rank and score by paket.
func (r *pageRepo) GetScoreAndRank(c context.Context, userID int, paket string) (float64, int, error) {
	var userScore float64
	var userRank int

	query := `
	WITH RankedUsers AS (
	    SELECT user_id, paket, tryout_score,
	           RANK() OVER (PARTITION BY paket ORDER BY tryout_score DESC) AS rank
	    FROM tryout_attempt WHERE status = 'finished'
	)
	SELECT tryout_score, rank FROM RankedUsers WHERE user_id = $1 AND paket = $2;
	`

	err := r.db.QueryRow(query, userID, paket).Scan(&userScore, &userRank)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get user score and rank", map[string]interface{}{"user_id": userID, "paket": paket})
		return 0, 0, err
	}

	return userScore, userRank, nil
}

// Query helper for per-subtest answers in an attempt.
func (s *pageRepo) GetUserAnswersBasedOnIDPaketAndSubtest(c context.Context, userID int, paket, subtest string) ([]models.UserAnswer, error) {
	query := `
	SELECT 
		ua.attempt_id, ua.subtest, ua.kode_soal, ua.jawaban
	FROM user_answers ua
	JOIN tryout_attempt ta ON ua.attempt_id = ta.attempt_id
	WHERE ta.user_id = $1 AND ta.paket = $2 AND ua.subtest = $3;
	`

	var userAnswers []models.UserAnswer
	err := s.db.Select(&userAnswers, query, userID, paket, subtest)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get user answers based on id paket and subtest", map[string]interface{}{"user_id": userID, "paket": paket, "subtest": subtest})
		return nil, err
	}

	return userAnswers, nil
}

func (s *pageRepo) GetOngoingAttemptByUserID(c context.Context, userID int) (*models.TryoutAttempt, error) {
	query := `SELECT * FROM tryout_attempt WHERE user_id = $1 AND status = 'ongoing'`
	var attempt models.TryoutAttempt
	err := s.db.Get(&attempt, query, userID)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get ongoing attempt", map[string]interface{}{"user_id": userID})
		return nil, err
	}
	return &attempt, nil
}

func (s *pageRepo) GetFinishedAttemptByUserID(c context.Context, userID int) (*models.TryoutAttempt, error) {
	query := `SELECT * FROM tryout_attempt WHERE user_id = $1 AND status = 'finished'`
	var attempt models.TryoutAttempt
	err := s.db.Get(&attempt, query, userID)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get finished attempt", map[string]interface{}{"user_id": userID})
		return nil, err
	}
	return &attempt, nil
}
