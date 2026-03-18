package services

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"
	"tryout-service/internal/logger"
	"tryout-service/internal/models"
	"tryout-service/internal/repositories"
)

type TryoutService interface {
	StartAttempt(c context.Context, userID int, username, paket string) (attempt *models.TryoutAttempt, retErr error)
	SyncWithDatabase(c context.Context, answers []models.AnswerPayload, attemptID int) (answersInDB []models.UserAnswer, timeLimit time.Time, err error)
	SubmitCurrentSubtest(c context.Context, answers []models.AnswerPayload, attemptID, userID int, accessToken string) (updatedSubtest string, retErr error)
	FinishTryoutNow(c context.Context, answers []models.AnswerPayload, attemptID, userID int, accessToken string) (updatedSubtest string, retErr error)
	GetCurrentAttemptByUserID(c context.Context, userID int) (*models.TryoutAttempt, error)
}

type tryoutService struct {
	tryoutRepo   repositories.TryoutRepo
	scoreService ScoreService
}

func NewTryoutService(tryoutRepo repositories.TryoutRepo, scoreService ScoreService) TryoutService {
	return &tryoutService{tryoutRepo: tryoutRepo, scoreService: scoreService}
}

func (s *tryoutService) StartAttempt(c context.Context, userID int, username, paket string) (attempt *models.TryoutAttempt, retErr error) {
	if userID <= 0 {
		return nil, ErrAuthContextInvalid
	}
	username = strings.TrimSpace(username)
	paket = strings.TrimSpace(paket)
	if username == "" || paket == "" {
		return nil, ErrInvalidAnswerPayload
	}

	// sstart a transaction to the db
	startTime := time.Now()
	tx, err := s.tryoutRepo.BeginTransaction(c)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to start transaction for starting attempt", map[string]interface{}{
			"userID":   userID,
			"username": username,
			"paket":    paket,
		})
		return nil, err
	}

	// Defer rollback if error occurs, if something returns an error
	defer func() {
		if retErr != nil {
			if rbErr := tx.Rollback(); rbErr != nil {
				logger.LogErrorCtx(c, rbErr, "Failed to rollback transaction after error", map[string]interface{}{
					"userID":   userID,
					"username": username,
					"paket":    paket,
				})
			}
		}
	}()

	// Check if user already has an ongoing attempt
	hasOngoing, err := s.tryoutRepo.HasOngoingAttemptByUserIDTx(c, tx, userID)
	if err != nil {
		retErr = err
		return nil, retErr
	}
	if hasOngoing {
		retErr = ErrAttemptAlreadyOngoing
		return nil, retErr
	}

	// Create new attempt object to later be saved in the database
	attempt = &models.TryoutAttempt{
		UserID:    userID,
		Username:  username,
		StartTime: startTime,
		Paket:     paket,
	}

	// Create new attempt, calling the db
	err = s.tryoutRepo.CreateTryoutAttemptTx(c, tx, attempt)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate key") {
			retErr = ErrAttemptAlreadyOngoing
			return nil, retErr
		}
		logger.LogErrorCtx(c, err, "Failed to create tryout attempt", map[string]interface{}{
			"userID":   userID,
			"username": username,
			"paket":    paket,
		})
		retErr = err
		return nil, retErr
	}

	// Issue tryout token using the access token and attempt id and user id from create tryout attempt

	// commit transaction if everything is successful
	if err := tx.Commit(); err != nil {
		logger.LogErrorCtx(c, err, "Failed to commit transaction after starting attempt", map[string]interface{}{
			"userID":   userID,
			"username": username,
			"paket":    paket,
		})
		retErr = err
		return nil, retErr
	}

	return attempt, nil
}

// SyncWithDatabase is a service that syncs the answers from the user with the database
func (s *tryoutService) SyncWithDatabase(c context.Context, answers []models.AnswerPayload, attemptID int) (answersInDB []models.UserAnswer, timeLimit time.Time, retErr error) {
	var committed bool
	// EMPTY ANSWERS ARE OKAY, BUT IF THERE ARE ANSWERS, THEY MUST BE VALID
	// Start transaction
	tx, err := s.tryoutRepo.BeginTransaction(c)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to start transaction for syncing with database", map[string]interface{}{"attemptID": attemptID})
		return nil, time.Time{}, err
	}

	// Ensure rollback on error
	defer func() {
		if committed {
			return
		}
		if retErr != nil {
			if rbErr := tx.Rollback(); rbErr != nil {
				logger.LogErrorCtx(c, rbErr, "Failed to rollback transaction after error", map[string]interface{}{
					"layer":     "service",
					"operation": "SyncWithDatabase",
					"attemptID": attemptID,
				})
			}
		}
	}()

	// Get and validate current attempt within transaction
	attempt, err := s.tryoutRepo.GetTryoutAttemptTx(c, tx, attemptID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			retErr = ErrAttemptNotFound
			return nil, time.Time{}, retErr
		}
		retErr = err
		logger.LogErrorCtx(c, err, "Failed to get tryout attempt", map[string]interface{}{
			"attemptID": attemptID,
		})
		return nil, time.Time{}, retErr
	}

	if attempt.EndTime != nil {
		retErr = ErrAttemptEnded
		return nil, time.Time{}, retErr
	}
	if attempt.Status != "ongoing" {
		retErr = ErrAttemptNotOngoing
		return nil, time.Time{}, retErr
	}
	if attempt.SubtestSekarang == "" {
		retErr = ErrNoActiveSubtest
		return nil, time.Time{}, retErr
	}

	// Get time limit within transaction
	timeLimit, err = s.tryoutRepo.GetSubtestTimeTx(c, tx, attemptID, attempt.SubtestSekarang)
	if err != nil {
		retErr = err
		logger.LogErrorCtx(c, err, "Failed to get time limit for subtest", map[string]interface{}{
			"attemptID": attemptID,
			"subtest":   attempt.SubtestSekarang,
		})
		return nil, time.Time{}, retErr
	}

	// exceed time limit
	if time.Now().After(timeLimit) {
		// Delete attempt and answers if time limit has been reached
		if err = s.tryoutRepo.DeleteAttempt(c, tx, attemptID); err != nil {
			retErr = err
			logger.LogErrorCtx(c, err, "Failed to delete attempt", map[string]interface{}{
				"attemptID": attemptID,
			})
			return nil, time.Time{}, retErr
		}
		// Commit transaction so that the attempt is deleted
		if err = tx.Commit(); err != nil {
			retErr = err
			logger.LogErrorCtx(c, err, "Failed to commit transaction after deleting attempt", map[string]interface{}{
				"attemptID": attemptID,
			})

			return nil, time.Time{}, retErr
		}
		// set committed to true so that the defer won't rollback the transaction
		committed = true
		retErr = ErrTimeLimitReached
		return nil, time.Time{}, retErr
	}

	// Process and save new answers
	if len(answers) > 0 {
		userAnswers, err := buildUserAnswers(answers, attemptID, attempt.SubtestSekarang)
		if err != nil {
			retErr = err
			return nil, timeLimit, retErr
		}

		if err = s.tryoutRepo.SaveAnswersTx(c, tx, userAnswers); err != nil {
			retErr = err
			logger.LogErrorCtx(c, err, "Failed to save answers", map[string]interface{}{
				"attemptID": attemptID,
			})
			return nil, timeLimit, retErr
		}
	}

	// Get updated answers within transaction
	answersInDB, err = s.tryoutRepo.GetAnswerFromCurrentAttemptAndSubtestTx(c, tx, attemptID, attempt.SubtestSekarang)
	if err != nil {
		retErr = err
		logger.LogErrorCtx(c, err, "Failed to fetch user answers", map[string]interface{}{
			"attemptID": attemptID,
			"subtest":   attempt.SubtestSekarang,
		})
		return nil, timeLimit, retErr
	}

	// Commit transaction
	if err = tx.Commit(); err != nil {
		retErr = err
		logger.LogErrorCtx(c, err, "Failed to commit transaction after syncing with database", map[string]interface{}{
			"attemptID": attemptID,
		})
		return nil, timeLimit, retErr
	}
	// set committed to true so that the defer won't rollback the transaction
	committed = true

	// will return answers that are stored in the db (for sync purpose) and the time limit also for the sync purpose
	return answersInDB, timeLimit, nil
}

func (s *tryoutService) SubmitCurrentSubtest(c context.Context, answers []models.AnswerPayload, attemptID, userID int, accessToken string) (updatedSubtest string, retErr error) {
	return s.submitAttempt(c, answers, attemptID, userID, accessToken, false)
}

func (s *tryoutService) FinishTryoutNow(c context.Context, answers []models.AnswerPayload, attemptID, userID int, accessToken string) (updatedSubtest string, retErr error) {
	return s.submitAttempt(c, answers, attemptID, userID, accessToken, true)
}

func (s *tryoutService) submitAttempt(c context.Context, answers []models.AnswerPayload, attemptID, userID int, accessToken string, forceFinish bool) (updatedSubtest string, retErr error) {
	// begin a transaction
	var committed bool
	tx, err := s.tryoutRepo.BeginTransaction(c)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to start transaction for submitting current subtest", map[string]interface{}{"attemptID": attemptID})
		return "", err
	}
	// if something happened, rollback the transaction
	defer func() {
		if committed {
			return
		}
		if retErr != nil && tx != nil {
			if rbErr := tx.Rollback(); rbErr != nil {
				logger.LogErrorCtx(c, rbErr, "Failed to rollback transaction", map[string]interface{}{
					"attemptID": attemptID,
				})
			}
			tx = nil
		}
	}()

	// Get and validate current attempt
	attempt, err := s.tryoutRepo.GetTryoutAttemptTx(c, tx, attemptID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			retErr = ErrAttemptNotFound
			return "", retErr
		}
		logger.LogErrorCtx(c, err, "Failed to get tryout attempt", map[string]interface{}{"attemptID": attemptID})
		retErr = err
		return "", retErr
	}

	// validate the attempt
	if attempt.EndTime != nil {
		retErr = ErrAttemptEnded
		return "", retErr
	}

	if attempt.Status != "ongoing" {
		retErr = ErrAttemptNotOngoing
		return "", retErr
	}

	if attempt.SubtestSekarang == "" {
		retErr = ErrNoActiveSubtest
		return "", retErr
	}

	// Get time limit within transaction
	timeLimit, err := s.tryoutRepo.GetSubtestTimeTx(c, tx, attemptID, attempt.SubtestSekarang)
	if err != nil {
		retErr = err
		logger.LogErrorCtx(c, err, "Failed to get time limit", map[string]interface{}{
			"attemptID": attemptID,
			"subtest":   attempt.SubtestSekarang,
		})
		return "", retErr
	}

	// exceed time limit
	if time.Now().After(timeLimit) {
		// Delete attempt and answers if time limit has been reached
		if err = s.tryoutRepo.DeleteAttempt(c, tx, attemptID); err != nil {
			retErr = err
			logger.LogErrorCtx(c, err, "Failed to delete attempt", map[string]interface{}{
				"attemptID": attemptID,
			})
			return "", retErr
		}
		// Commit transaction so that the attempt is deleted
		if err = tx.Commit(); err != nil {
			retErr = err
			logger.LogErrorCtx(c, err, "Failed to commit transaction after deleting attempt", map[string]interface{}{
				"attemptID": attemptID,
			})
			return "", retErr
		}
		// set committed to true so that the defer won't rollback the transaction
		committed = true
		retErr = ErrTimeLimitReached
		return "", retErr
	}

	// Get the next subtest
	currentSubtest := attempt.SubtestSekarang
	subtests := []string{"subtest_pu", "subtest_ppu", "subtest_pbm", "subtest_pk", "subtest_lbi", "subtest_lbe", "subtest_pm"}
	var nextSubtest *string
	for i, sub := range subtests {
		if sub == currentSubtest {
			if i < len(subtests)-1 {
				nextSubtest = &subtests[i+1]
			}
			break
		}
	}

	// Save final answers if any
	if len(answers) > 0 {
		userAnswers, err := buildUserAnswers(answers, attemptID, attempt.SubtestSekarang)
		if err != nil {
			retErr = err
			return "", retErr
		}
		// Save the answers using the transaction
		err = s.tryoutRepo.SaveAnswersTx(c, tx, userAnswers)
		if err != nil {
			logger.LogErrorCtx(c, err, "Failed to save final answers", map[string]interface{}{
				"attemptID": attemptID,
			})
			retErr = err
			return "", retErr
		}
	}

	// if forced finish or no next subtest, end the tryout
	if forceFinish || nextSubtest == nil {
		// end the tryout
		err = s.tryoutRepo.EndTryOutTx(c, tx, attemptID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				retErr = ErrAttemptNotOngoing
				return "", retErr
			}
			logger.LogErrorCtx(c, err, "Failed to end tryout", map[string]interface{}{
				"attemptID": attemptID,
			})
			retErr = err
			return "", retErr
		}

		// Phase 1: finalize attempt state and commit quickly.
		if err := tx.Commit(); err != nil {
			logger.LogErrorCtx(c, err, "Failed to commit transaction after finalizing tryout", map[string]interface{}{
				"attemptID": attemptID,
			})
			retErr = err
			return "", retErr
		}
		// set committed to true so that the defer won't rollback the transaction
		committed = true
		tx = nil

		// Phase 2: calculate and store scores in a dedicated transaction.
		err = s.scoreService.CalculateAndStoreScores(c, attemptID, userID, attempt.Paket, accessToken)
		if err != nil {
			logger.LogErrorCtx(c, err, "Failed to calculate and store scores", map[string]interface{}{
				"attemptID": attemptID,
				"paket":     attempt.Paket,
			})
			retErr = ErrScoringFailed
			return "", retErr
		}

		// return final indicating a final state
		return "final", nil
	}

	// End current subtest and move to the next subtest
	updatedSubtest, err = s.tryoutRepo.ProgressTryoutTx(c, tx, attemptID, *nextSubtest)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to end subtest", map[string]interface{}{
			"attemptID": attemptID,
		})
		retErr = err
		return "", retErr
	}

	// commit the transactions if everything is successful
	if err := tx.Commit(); err != nil {
		logger.LogErrorCtx(c, err, "Failed to commit transaction after submitting current subtest", map[string]interface{}{
			"attemptID": attemptID,
		})
		retErr = err
		return "", retErr
	}
	// set committed to true so that the defer won't rollback the transaction
	committed = true
	tx = nil

	// return updated so later the frontend can fetch the next subtest
	return updatedSubtest, nil
}

func (s *tryoutService) GetCurrentAttemptByUserID(c context.Context, userID int) (*models.TryoutAttempt, error) {
	attempt, err := s.tryoutRepo.GetOngoingAttemptByUserID(c, userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrAttemptNotFound
		}
		return nil, err
	}

	return attempt, nil
}

func buildUserAnswers(answers []models.AnswerPayload, attemptID int, subtest string) ([]models.UserAnswer, error) {
	userAnswers := make([]models.UserAnswer, 0, len(answers))
	for _, answer := range answers {
		kodeSoal := strings.TrimSpace(answer.KodeSoal)
		if kodeSoal == "" || answer.Jawaban == nil {
			return nil, ErrInvalidAnswerPayload
		}

		jawaban := strings.TrimSpace(*answer.Jawaban)
		if jawaban == "" {
			return nil, ErrInvalidAnswerPayload
		}

		userAnswers = append(userAnswers, models.UserAnswer{
			TryoutAttemptID: attemptID,
			Subtest:         subtest,
			KodeSoal:        kodeSoal,
			Jawaban:         jawaban,
		})
	}

	return userAnswers, nil
}
