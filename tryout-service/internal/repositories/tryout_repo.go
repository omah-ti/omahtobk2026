package repositories

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"
	"tryout-service/internal/logger"
	"tryout-service/internal/models"

	"github.com/jmoiron/sqlx"
)

type TryoutRepo interface {
	BeginTransaction(c context.Context) (*sqlx.Tx, error)
	CreateTryoutAttemptTx(c context.Context, tx *sqlx.Tx, attempt *models.TryoutAttempt) error // Create a new tryout attempt
	HasOngoingAttemptByUserIDTx(c context.Context, tx *sqlx.Tx, userID int) (bool, error)
	GetOngoingAttemptByUserID(c context.Context, userID int) (*models.TryoutAttempt, error)
	GetTryoutAttemptByUserIDAndPaket(c context.Context, userID int, paket string) (*models.TryoutAttempt, error)                        // Get the ongoing tryout attempt for a user
	GetTryoutAttemptTx(c context.Context, tx *sqlx.Tx, attemptID int) (*models.TryoutAttempt, error)                                    // Get a tryout attempt by its ID, including the user's answers based on the current subtest also (for transactinos)
	GetAnswerFromCurrentAttemptAndSubtestTx(c context.Context, tx *sqlx.Tx, attemptID int, subtest string) ([]models.UserAnswer, error) // Get user's answers for the current subtest (for transactions)
	GetSubtestTimeTx(c context.Context, tx *sqlx.Tx, attemptID int, subtest string) (time.Time, error)                                  // Get the remaining time for a subtest (for transactions)
	SaveAnswersTx(c context.Context, tx *sqlx.Tx, answers []models.UserAnswer) error                                                    // Save user's answers to the database
	ProgressTryoutTx(c context.Context, tx *sqlx.Tx, attemptID int, subtest string) (string, error)                                     // End a subtest attempt, marking the end time
	EndTryOutTx(c context.Context, tx *sqlx.Tx, attemptID int) error
	GetTryoutAttempt(c context.Context, attemptID int) (*models.TryoutAttempt, error) // End a tryout attempt, marking the end time
	DeleteAttempt(c context.Context, tx *sqlx.Tx, attemptID int) error
}

type tryoutRepo struct {
	db *sqlx.DB
}

func NewTryoutRepo(db *sqlx.DB) TryoutRepo {
	return &tryoutRepo{db: db}
}

func (r *tryoutRepo) BeginTransaction(c context.Context) (*sqlx.Tx, error) {
	tx, err := r.db.Beginx()
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to start transaction")
		return nil, err
	}

	logger.LogDebugCtx(c, "Transaction started")
	return tx, nil
}

func (r *tryoutRepo) CreateTryoutAttemptTx(c context.Context, tx *sqlx.Tx, attempt *models.TryoutAttempt) error {
	// Insert into tryout_attempt and get attempt_id
	query := `INSERT INTO tryout_attempt (user_id, username, start_time, subtest_sekarang, paket, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING attempt_id`
	startTime := time.Now()
	err := tx.QueryRowx(query, attempt.UserID, attempt.Username, startTime, "subtest_pu", attempt.Paket, "ongoing").Scan(&attempt.TryoutAttemptID)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to create tryout attempt")
		return err
	}

	// Define subtests and their time limits
	subtests := []struct {
		Subtest   string
		TimeLimit time.Duration // Time in minutes
	}{
		{"subtest_pu", 31 * time.Minute},
		{"subtest_ppu", 16 * time.Minute},
		{"subtest_pbm", 26 * time.Minute},
		{"subtest_pk", 21 * time.Minute},
		{"subtest_lbi", 46 * time.Minute},
		{"subtest_lbe", 31 * time.Minute},
		{"subtest_pm", 31 * time.Minute},
	}

	// Construct the query for batch insertion
	var values []string
	var args []interface{}
	currentTime := startTime
	for i, sub := range subtests {
		startTime := currentTime
		endTime := startTime.Add(sub.TimeLimit) // Calculate end time

		values = append(values, fmt.Sprintf("($%d, $%d, $%d)", i*3+1, i*3+2, i*3+3))
		args = append(args, attempt.TryoutAttemptID, sub.Subtest, endTime)
		currentTime = endTime
	}

	timeQuery := fmt.Sprintf(`INSERT INTO time_limit (attempt_id, subtest, time_limit) VALUES %s`, strings.Join(values, ", "))
	_, err = tx.Exec(timeQuery, args...)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to insert time limits for tryout attempt", map[string]interface{}{"attempt_id": attempt.TryoutAttemptID})
		return err
	}

	logger.LogDebugCtx(c, "Tryout attempt created successfully", map[string]interface{}{"attempt_id": attempt.TryoutAttemptID})

	return nil
}

func (r *tryoutRepo) HasOngoingAttemptByUserIDTx(c context.Context, tx *sqlx.Tx, userID int) (bool, error) {
	var exists bool
	query := `SELECT EXISTS(SELECT 1 FROM tryout_attempt WHERE user_id = $1 AND status = 'ongoing')`
	err := tx.Get(&exists, query, userID)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to check ongoing tryout attempt", map[string]interface{}{"user_id": userID})
		return false, err
	}
	return exists, nil
}

func (r *tryoutRepo) GetOngoingAttemptByUserID(c context.Context, userID int) (*models.TryoutAttempt, error) {
	var attempt models.TryoutAttempt
	query := `SELECT * FROM tryout_attempt WHERE user_id = $1 AND status = 'ongoing' ORDER BY start_time DESC LIMIT 1`
	err := r.db.Get(&attempt, query, userID)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get ongoing attempt", map[string]interface{}{"user_id": userID})
		return nil, err
	}

	logger.LogDebugCtx(c, "Ongoing attempt retrieved", map[string]interface{}{"user_id": userID, "attempt_id": attempt.TryoutAttemptID})
	return &attempt, nil
}

func (r *tryoutRepo) SaveAnswersTx(c context.Context, tx *sqlx.Tx, answers []models.UserAnswer) error {
	if len(answers) == 0 {
		return nil // No data to insert
	}

	query := `INSERT INTO user_answers (attempt_id, subtest, kode_soal, jawaban) VALUES `

	// Constructing bulk insert placeholders
	var values []interface{}
	var placeholders []string
	for i, answer := range answers {
		placeholders = append(placeholders, fmt.Sprintf("($%d, $%d, $%d, $%d)", i*4+1, i*4+2, i*4+3, i*4+4))
		values = append(values, answer.TryoutAttemptID, answer.Subtest, answer.KodeSoal, answer.Jawaban)
	}

	// Joining placeholders to form the full query
	query += strings.Join(placeholders, ",")
	query += ` ON CONFLICT (attempt_id, kode_soal) DO UPDATE SET jawaban = EXCLUDED.jawaban`

	// Executing the query
	_, err := tx.Exec(query, values...)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to save user answers", map[string]interface{}{"answers_count": len(answers)})
		return err
	}

	logger.LogDebugCtx(c, "User answers saved/updated", map[string]interface{}{"answers_count": len(answers)})
	return nil
}

func (r *tryoutRepo) ProgressTryoutTx(c context.Context, tx *sqlx.Tx, attemptID int, subtest string) (string, error) {
	// Update the tryout attempt with end_time and next subtest (or NULL if last subtest)
	var subtestUpdated string
	updateQuery := `UPDATE tryout_attempt SET subtest_sekarang = $1 WHERE attempt_id = $2 AND status = 'ongoing' RETURNING subtest_sekarang`
	err := tx.QueryRow(updateQuery, subtest, attemptID).Scan(&subtestUpdated)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to update tryout attempt", map[string]interface{}{"attempt_id": attemptID, "subtest": subtest})
		return "", err
	}

	logger.LogDebugCtx(c, "Tryout attempt progressed", map[string]interface{}{
		"attempt_id": attemptID, "subtest": subtest,
		"next": subtest,
	})

	return subtestUpdated, nil
}

func (r *tryoutRepo) EndTryOutTx(c context.Context, tx *sqlx.Tx, attemptID int) error {
	query := `UPDATE tryout_attempt SET end_time = $1, status = 'finished' WHERE attempt_id = $2 AND status = 'ongoing'`
	result, err := tx.Exec(query, time.Now(), attemptID)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to end tryout attempt", map[string]interface{}{
			"attempt_id": attemptID,
		})
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to check rows affected when ending tryout", map[string]interface{}{"attempt_id": attemptID})
		return err
	}
	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	logger.LogDebugCtx(c, "Tryout attempt ended", map[string]interface{}{
		"attempt_id": attemptID,
	})

	return nil
}

func (r *tryoutRepo) GetTryoutAttemptTx(c context.Context, tx *sqlx.Tx, attemptID int) (*models.TryoutAttempt, error) {
	var attempt models.TryoutAttempt

	query := `SELECT * FROM tryout_attempt WHERE attempt_id = $1 FOR UPDATE`
	err := tx.Get(&attempt, query, attemptID)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get tryout attempt", map[string]interface{}{
			"attempt_id": attemptID,
		})
		return nil, err
	}

	logger.LogDebugCtx(c, "Tryout attempt retrieved", map[string]interface{}{
		"attempt_id": attemptID,
	})
	return &attempt, nil
}

func (r *tryoutRepo) GetAnswerFromCurrentAttemptAndSubtestTx(c context.Context, tx *sqlx.Tx, attemptID int, subtest string) ([]models.UserAnswer, error) {
	var answers []models.UserAnswer

	query := `SELECT attempt_id, subtest, kode_soal, jawaban FROM user_answers WHERE attempt_id = $1 AND subtest = $2`
	err := tx.Select(&answers, query, attemptID, subtest)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get user answers from attempt and subtest", map[string]interface{}{
			"attempt_id": attemptID,
			"subtest":    subtest,
		})
		return nil, err
	}

	logger.LogDebugCtx(c, "User answers retrieved", map[string]interface{}{
		"attempt_id": attemptID,
		"subtest":    subtest,
	})
	return answers, nil
}

func (r *tryoutRepo) GetSubtestTimeTx(c context.Context, tx *sqlx.Tx, attemptID int, subtest string) (time.Time, error) {
	var timeLimit time.Time

	query := `SELECT time_limit FROM time_limit WHERE attempt_id = $1 AND subtest = $2`
	err := tx.Get(&timeLimit, query, attemptID, subtest)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get subtest time limit", map[string]interface{}{
			"attempt_id": attemptID,
			"subtest":    subtest,
		})
		return time.Time{}, err
	}

	logger.LogDebugCtx(c, "Time limit retrieved", map[string]interface{}{
		"attempt_id": attemptID,
		"subtest":    subtest,
		"time_limit": timeLimit})
	return timeLimit, nil
}

func (r *tryoutRepo) GetTryoutAttemptByUserIDAndPaket(c context.Context, userID int, paket string) (*models.TryoutAttempt, error) {
	var attempt models.TryoutAttempt
	query := `SELECT user_id, username, attempt_id, tryout_score FROM tryout_attempt WHERE user_id = $1 AND status = $2 AND paket = $3`
	err := r.db.Get(&attempt, query, userID, "finished", paket)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get tryout attempt by user ID and paket", map[string]interface{}{"user_id": userID, "paket": paket})
		return nil, err
	}

	logger.LogDebugCtx(c, "Attempt retrieved", map[string]interface{}{
		"attempt_id": attempt.TryoutAttemptID,
		"user_id":    userID,
		"paket":      paket,
	})
	return &attempt, nil
}

func (r *tryoutRepo) GetTryoutAttempt(c context.Context, attemptID int) (*models.TryoutAttempt, error) {
	var attempt models.TryoutAttempt
	query := `SELECT * FROM tryout_attempt WHERE attempt_id = $1 AND status = 'ongoing'`
	err := r.db.Get(&attempt, query, attemptID)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get tryout attempt", map[string]interface{}{"attempt_id": attemptID})
		return nil, err
	}

	logger.LogDebugCtx(c, "Attempt retrieved", map[string]interface{}{"attempt_id": attemptID})
	return &attempt, nil
}

func (r *tryoutRepo) DeleteAttempt(c context.Context, tx *sqlx.Tx, attemptID int) error {
	query := `DELETE FROM tryout_attempt WHERE attempt_id = $1`
	_, err := tx.Exec(query, attemptID)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to delete attempt", map[string]interface{}{
			"attempt_id": attemptID,
			"error":      err.Error(),
		})
		return err
	}

	logger.LogDebugCtx(c, "Attempt deleted successfully", map[string]interface{}{
		"attempt_id": attemptID,
	})
	return nil
}
