package services

import (
	"context"
	"database/sql"
	"errors"
	"sort"
	"strings"
	"time"
	"tryout-service/internal/logger"
	"tryout-service/internal/models"
	"tryout-service/internal/repositories"

	"github.com/jmoiron/sqlx"
)

type TryoutService interface {
	StartAttempt(c context.Context, userID int, username, paket string) (attempt *models.TryoutAttempt, retErr error)
	StartSubtest(c context.Context, attemptID int, subtest string) (answersInDB []models.UserAnswer, timeLimit time.Time, retErr error)
	SaveSubtestAnswers(c context.Context, answers []models.AnswerPayload, attemptID int, subtest string) (answersInDB []models.UserAnswer, timeLimit time.Time, retErr error)
	SubmitSubtest(c context.Context, answers []models.AnswerPayload, attemptID, userID int, accessToken, subtest string) (updatedSubtest string, retErr error)
	SyncWithDatabase(c context.Context, answers []models.AnswerPayload, attemptID int) (answersInDB []models.UserAnswer, timeLimit time.Time, err error)
	SubmitCurrentSubtest(c context.Context, answers []models.AnswerPayload, attemptID, userID int, accessToken string) (updatedSubtest string, retErr error)
	FinishTryoutNow(c context.Context, answers []models.AnswerPayload, attemptID, userID int, accessToken string) (updatedSubtest string, retErr error)
	GetCurrentAttemptByUserID(c context.Context, userID int) (*models.TryoutAttempt, error)
}

type tryoutService struct {
	tryoutRepo   repositories.TryoutRepo
	scoreService ScoreService
}

var orderedSubtests = []string{"subtest_pu", "subtest_ppu", "subtest_pbm", "subtest_pk", "subtest_lbi", "subtest_lbe", "subtest_pm"}
var subtestDurations = map[string]time.Duration{
	"subtest_pu":  30 * time.Minute,
	"subtest_ppu": 16 * time.Minute,
	"subtest_pbm": 26 * time.Minute,
	"subtest_pk":  21 * time.Minute,
	"subtest_lbi": 46 * time.Minute,
	"subtest_lbe": 31 * time.Minute,
	"subtest_pm":  31 * time.Minute,
}
var detachedScoreRefreshTimeout = 45 * time.Second

type expiredAttemptAdvanceResult struct {
	ExpiredSubtest string
	NextSubtest    string
	Finished       bool
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

func (s *tryoutService) StartSubtest(c context.Context, attemptID int, subtest string) (answersInDB []models.UserAnswer, timeLimit time.Time, retErr error) {
	return s.syncSubtestAnswers(c, nil, attemptID, subtest)
}

func (s *tryoutService) SaveSubtestAnswers(c context.Context, answers []models.AnswerPayload, attemptID int, subtest string) (answersInDB []models.UserAnswer, timeLimit time.Time, retErr error) {
	return s.syncSubtestAnswers(c, answers, attemptID, subtest)
}

// SyncWithDatabase is kept for backward compatibility with legacy /sync endpoints.
func (s *tryoutService) SyncWithDatabase(c context.Context, answers []models.AnswerPayload, attemptID int) (answersInDB []models.UserAnswer, timeLimit time.Time, retErr error) {
	return s.syncSubtestAnswers(c, answers, attemptID, "")
}

func (s *tryoutService) syncSubtestAnswers(c context.Context, answers []models.AnswerPayload, attemptID int, requestedSubtest string) (answersInDB []models.UserAnswer, timeLimit time.Time, retErr error) {
	var committed bool
	requestedSubtest = strings.TrimSpace(requestedSubtest)

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

	if requestedSubtest == "" {
		requestedSubtest = attempt.SubtestSekarang
	}

	if requestedSubtest != attempt.SubtestSekarang {
		retErr = &SubtestOutOfOrderError{
			RequestedSubtest: requestedSubtest,
			ActiveSubtest:    attempt.SubtestSekarang,
			AttemptID:        attempt.TryoutAttemptID,
		}
		return nil, time.Time{}, retErr
	}

	timeLimit, err = s.ensureSubtestTimeLimitTx(c, tx, attempt, requestedSubtest)
	if err != nil {
		retErr = err
		logger.LogErrorCtx(c, err, "Failed to get time limit for subtest", map[string]interface{}{
			"attemptID": attemptID,
			"subtest":   requestedSubtest,
		})
		return nil, time.Time{}, retErr
	}

	if time.Now().After(timeLimit) {
		advanceResult, advanceErr := s.advanceExpiredAttemptTx(c, tx, attempt)
		if advanceErr != nil {
			retErr = advanceErr
			return nil, time.Time{}, retErr
		}
		if err = tx.Commit(); err != nil {
			retErr = err
			logger.LogErrorCtx(c, err, "Failed to commit transaction after advancing expired subtest", map[string]interface{}{
				"attemptID": attemptID,
			})
			return nil, time.Time{}, retErr
		}

		committed = true

		if advanceResult.Finished {
			retErr = ErrAttemptEnded
			return nil, time.Time{}, retErr
		}

		retErr = &SubtestOutOfOrderError{
			RequestedSubtest: requestedSubtest,
			ActiveSubtest:    advanceResult.NextSubtest,
			AttemptID:        attemptID,
		}
		return nil, time.Time{}, retErr
	}

	if len(answers) > 0 {
		userAnswers, err := buildUserAnswers(answers, attemptID, requestedSubtest)
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

	answersInDB, err = s.tryoutRepo.GetAnswerFromCurrentAttemptAndSubtestTx(c, tx, attemptID, requestedSubtest)
	if err != nil {
		retErr = err
		logger.LogErrorCtx(c, err, "Failed to fetch user answers", map[string]interface{}{
			"attemptID": attemptID,
			"subtest":   requestedSubtest,
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
	committed = true

	return answersInDB, timeLimit, nil
}

func (s *tryoutService) SubmitSubtest(c context.Context, answers []models.AnswerPayload, attemptID, userID int, accessToken, subtest string) (updatedSubtest string, retErr error) {
	return s.submitAttempt(c, answers, attemptID, userID, accessToken, strings.TrimSpace(subtest), false)
}

func (s *tryoutService) SubmitCurrentSubtest(c context.Context, answers []models.AnswerPayload, attemptID, userID int, accessToken string) (updatedSubtest string, retErr error) {
	return s.submitAttempt(c, answers, attemptID, userID, accessToken, "", false)
}

func (s *tryoutService) FinishTryoutNow(c context.Context, answers []models.AnswerPayload, attemptID, userID int, accessToken string) (updatedSubtest string, retErr error) {
	return s.submitAttempt(c, answers, attemptID, userID, accessToken, "", true)
}

func (s *tryoutService) submitAttempt(c context.Context, answers []models.AnswerPayload, attemptID, userID int, accessToken, requestedSubtest string, forceFinish bool) (updatedSubtest string, retErr error) {
	var committed bool
	requestedSubtest = strings.TrimSpace(requestedSubtest)

	tx, err := s.tryoutRepo.BeginTransaction(c)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to start transaction for submitting current subtest", map[string]interface{}{"attemptID": attemptID})
		return "", err
	}

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

	if requestedSubtest == "" {
		requestedSubtest = attempt.SubtestSekarang
	}

	if requestedSubtest != attempt.SubtestSekarang {
		retErr = &SubtestOutOfOrderError{
			RequestedSubtest: requestedSubtest,
			ActiveSubtest:    attempt.SubtestSekarang,
			AttemptID:        attempt.TryoutAttemptID,
		}
		return "", retErr
	}

	timeLimit, err := s.ensureSubtestTimeLimitTx(c, tx, attempt, requestedSubtest)
	if err != nil {
		retErr = err
		logger.LogErrorCtx(c, err, "Failed to get time limit", map[string]interface{}{
			"attemptID": attemptID,
			"subtest":   requestedSubtest,
		})
		return "", retErr
	}

	if time.Now().After(timeLimit) {
		advanceResult, advanceErr := s.advanceExpiredAttemptTx(c, tx, attempt)
		if advanceErr != nil {
			retErr = advanceErr
			return "", retErr
		}
		if err = tx.Commit(); err != nil {
			retErr = err
			logger.LogErrorCtx(c, err, "Failed to commit transaction after advancing expired subtest", map[string]interface{}{
				"attemptID": attemptID,
			})
			return "", retErr
		}

		committed = true

		if err := s.scoreService.CalculateAndStoreScoresForSubtests(c, attemptID, userID, attempt.Paket, accessToken, []string{requestedSubtest}); err != nil {
			logger.LogErrorCtx(c, err, "Failed to calculate score for expired submitted subtest; scheduling retry", map[string]interface{}{
				"attemptID": attemptID,
				"paket":     attempt.Paket,
				"subtest":   requestedSubtest,
			})
			s.scheduleDetachedScoreRefresh(c, attemptID, userID, attempt.Paket, accessToken, []string{requestedSubtest})
		}

		if advanceResult.Finished {
			retErr = ErrAttemptEnded
			return "", retErr
		}

		retErr = &SubtestOutOfOrderError{
			RequestedSubtest: requestedSubtest,
			ActiveSubtest:    advanceResult.NextSubtest,
			AttemptID:        attemptID,
		}
		return "", retErr
	}

	nextSubtest, err := resolveNextSubtest(attempt.SubtestSekarang)
	if err != nil {
		retErr = err
		return "", retErr
	}

	if len(answers) > 0 {
		userAnswers, err := buildUserAnswers(answers, attemptID, requestedSubtest)
		if err != nil {
			retErr = err
			return "", retErr
		}

		err = s.tryoutRepo.SaveAnswersTx(c, tx, userAnswers)
		if err != nil {
			logger.LogErrorCtx(c, err, "Failed to save final answers", map[string]interface{}{
				"attemptID": attemptID,
			})
			retErr = err
			return "", retErr
		}
	}

	shouldFinish := forceFinish || nextSubtest == nil
	if shouldFinish {
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
	} else {
		updatedSubtest, err = s.tryoutRepo.ProgressTryoutTx(c, tx, attemptID, *nextSubtest)
		if err != nil {
			logger.LogErrorCtx(c, err, "Failed to end subtest", map[string]interface{}{
				"attemptID": attemptID,
			})
			retErr = err
			return "", retErr
		}
	}

	if err := tx.Commit(); err != nil {
		logger.LogErrorCtx(c, err, "Failed to commit transaction after submitting current subtest", map[string]interface{}{
			"attemptID": attemptID,
		})
		retErr = err
		return "", retErr
	}

	committed = true
	tx = nil

	if shouldFinish {
		err = s.scoreService.CalculateAndStoreScores(c, attemptID, userID, attempt.Paket, accessToken)
		if err != nil {
			logger.LogErrorCtx(c, err, "Failed to calculate and store scores synchronously after finishing tryout; scheduling retry", map[string]interface{}{
				"attemptID": attemptID,
				"paket":     attempt.Paket,
			})
			s.scheduleDetachedScoreRefresh(c, attemptID, userID, attempt.Paket, accessToken, nil)
		}
	} else {
		err = s.scoreService.CalculateAndStoreScoresForSubtests(c, attemptID, userID, attempt.Paket, accessToken, []string{requestedSubtest})
		if err != nil {
			logger.LogErrorCtx(c, err, "Failed to calculate and store score for submitted subtest; scheduling retry", map[string]interface{}{
				"attemptID": attemptID,
				"paket":     attempt.Paket,
				"subtest":   requestedSubtest,
			})
			s.scheduleDetachedScoreRefresh(c, attemptID, userID, attempt.Paket, accessToken, []string{requestedSubtest})
		}
	}

	if shouldFinish {
		return "final", nil
	}

	return updatedSubtest, nil
}

func (s *tryoutService) GetCurrentAttemptByUserID(c context.Context, userID int) (*models.TryoutAttempt, error) {
	return s.getCurrentAttemptAfterTimeoutReconciliation(c, userID)
}

func (s *tryoutService) scheduleDetachedScoreRefresh(parent context.Context, attemptID, userID int, paket, accessToken string, subtests []string) {
	bgCtx, cancel := newDetachedScoreRefreshContext(parent)

	go func() {
		defer cancel()

		var err error
		if len(subtests) == 0 {
			err = s.scoreService.CalculateAndStoreScores(bgCtx, attemptID, userID, paket, accessToken)
		} else {
			err = s.scoreService.CalculateAndStoreScoresForSubtests(bgCtx, attemptID, userID, paket, accessToken, subtests)
		}

		if err != nil {
			logger.LogErrorCtx(bgCtx, err, "Failed to calculate and store scores in detached retry", map[string]interface{}{
				"attemptID": attemptID,
				"paket":     paket,
				"subtests":  subtests,
			})
		}
	}()
}

func newDetachedScoreRefreshContext(parent context.Context) (context.Context, context.CancelFunc) {
	detached := context.Background()

	if requestID, ok := parent.Value("request_id").(string); ok {
		requestID = strings.TrimSpace(requestID)
		if requestID != "" {
			detached = context.WithValue(detached, "request_id", requestID)
		}
	}

	return context.WithTimeout(detached, detachedScoreRefreshTimeout)
}

func (s *tryoutService) getCurrentAttemptAfterTimeoutReconciliation(c context.Context, userID int) (*models.TryoutAttempt, error) {
	for steps := 0; steps <= len(orderedSubtests); steps++ {
		attempt, err := s.tryoutRepo.GetOngoingAttemptByUserID(c, userID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return nil, ErrAttemptNotFound
			}
			return nil, err
		}

		tx, err := s.tryoutRepo.BeginTransaction(c)
		if err != nil {
			return nil, err
		}

		lockedAttempt, err := s.tryoutRepo.GetTryoutAttemptTx(c, tx, attempt.TryoutAttemptID)
		if err != nil {
			rollbackReconciliationTx(c, tx, userID, attempt.TryoutAttemptID, "load current attempt reconciliation")
			if errors.Is(err, sql.ErrNoRows) {
				return nil, ErrAttemptNotFound
			}
			return nil, err
		}

		if lockedAttempt.EndTime != nil || lockedAttempt.Status != "ongoing" || lockedAttempt.SubtestSekarang == "" {
			rollbackReconciliationTx(c, tx, userID, lockedAttempt.TryoutAttemptID, "finished attempt reconciliation")
			return nil, ErrAttemptNotFound
		}

		timeLimit, err := s.tryoutRepo.GetSubtestTimeTx(c, tx, lockedAttempt.TryoutAttemptID, lockedAttempt.SubtestSekarang)
		if errors.Is(err, sql.ErrNoRows) {
			rollbackReconciliationTx(c, tx, userID, lockedAttempt.TryoutAttemptID, "no active subtest time limit yet")
			return lockedAttempt, nil
		}
		if err != nil {
			rollbackReconciliationTx(c, tx, userID, lockedAttempt.TryoutAttemptID, "load current subtest time limit")
			return nil, err
		}

		if !time.Now().After(timeLimit) {
			rollbackReconciliationTx(c, tx, userID, lockedAttempt.TryoutAttemptID, "read-only attempt reconciliation")
			return lockedAttempt, nil
		}

		advanceResult, err := s.advanceExpiredAttemptTx(c, tx, lockedAttempt)
		if err != nil {
			rollbackReconciliationTx(c, tx, userID, lockedAttempt.TryoutAttemptID, "advance expired attempt")
			return nil, err
		}

		if err := tx.Commit(); err != nil {
			logger.LogErrorCtx(c, err, "Failed to commit current attempt reconciliation transaction", map[string]interface{}{
				"userID":    userID,
				"attemptID": lockedAttempt.TryoutAttemptID,
			})
			return nil, err
		}

		if err := s.scoreService.CalculateAndStoreScoresForSubtests(c, lockedAttempt.TryoutAttemptID, userID, lockedAttempt.Paket, "", []string{advanceResult.ExpiredSubtest}); err != nil {
			logger.LogErrorCtx(c, err, "Failed to calculate score while reconciling expired attempt; scheduling retry", map[string]interface{}{
				"userID":    userID,
				"attemptID": lockedAttempt.TryoutAttemptID,
				"subtest":   advanceResult.ExpiredSubtest,
			})
			s.scheduleDetachedScoreRefresh(c, lockedAttempt.TryoutAttemptID, userID, lockedAttempt.Paket, "", []string{advanceResult.ExpiredSubtest})
		}

		if advanceResult.Finished {
			return nil, ErrAttemptNotFound
		}
	}

	return nil, ErrAttemptNotFound
}

func rollbackReconciliationTx(c context.Context, tx *sqlx.Tx, userID, attemptID int, operation string) {
	if tx == nil {
		return
	}

	if err := tx.Rollback(); err != nil && !errors.Is(err, sql.ErrTxDone) {
		logger.LogErrorCtx(c, err, "Failed to rollback reconciliation transaction", map[string]interface{}{
			"userID":    userID,
			"attemptID": attemptID,
			"operation": operation,
		})
	}
}

func (s *tryoutService) advanceExpiredAttemptTx(c context.Context, tx *sqlx.Tx, attempt *models.TryoutAttempt) (expiredAttemptAdvanceResult, error) {
	currentSubtest := strings.TrimSpace(attempt.SubtestSekarang)
	if attempt == nil || currentSubtest == "" {
		return expiredAttemptAdvanceResult{}, ErrNoActiveSubtest
	}

	nextSubtest, err := resolveNextSubtest(currentSubtest)
	if err != nil {
		return expiredAttemptAdvanceResult{}, err
	}

	if nextSubtest == nil {
		if err := s.tryoutRepo.EndTryOutTx(c, tx, attempt.TryoutAttemptID); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return expiredAttemptAdvanceResult{}, ErrAttemptNotOngoing
			}
			logger.LogErrorCtx(c, err, "Failed to finish expired tryout attempt", map[string]interface{}{
				"attemptID": attempt.TryoutAttemptID,
				"subtest":   currentSubtest,
			})
			return expiredAttemptAdvanceResult{}, err
		}

		return expiredAttemptAdvanceResult{
			ExpiredSubtest: currentSubtest,
			Finished:       true,
		}, nil
	}

	updatedSubtest, err := s.tryoutRepo.ProgressTryoutTx(c, tx, attempt.TryoutAttemptID, *nextSubtest)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to advance expired tryout attempt", map[string]interface{}{
			"attemptID": attempt.TryoutAttemptID,
			"subtest":   currentSubtest,
			"next":      *nextSubtest,
		})
		return expiredAttemptAdvanceResult{}, err
	}

	return expiredAttemptAdvanceResult{
		ExpiredSubtest: currentSubtest,
		NextSubtest:    updatedSubtest,
		Finished:       false,
	}, nil
}

func (s *tryoutService) ensureSubtestTimeLimitTx(c context.Context, tx *sqlx.Tx, attempt *models.TryoutAttempt, subtest string) (time.Time, error) {
	if attempt == nil {
		return time.Time{}, ErrAttemptNotFound
	}

	subtest = strings.TrimSpace(subtest)
	if subtest == "" {
		return time.Time{}, ErrNoActiveSubtest
	}

	existing, err := s.tryoutRepo.GetSubtestTimeTx(c, tx, attempt.TryoutAttemptID, subtest)
	if err == nil {
		return existing, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return time.Time{}, err
	}

	duration, ok := subtestDurations[subtest]
	if !ok {
		return time.Time{}, ErrNoActiveSubtest
	}

	base := time.Now()

	previousSubtest, err := resolvePreviousSubtest(subtest)
	if err != nil {
		return time.Time{}, err
	}

	if previousSubtest != nil {
		previousLimit, prevErr := s.tryoutRepo.GetSubtestTimeTx(c, tx, attempt.TryoutAttemptID, *previousSubtest)
		if prevErr != nil && !errors.Is(prevErr, sql.ErrNoRows) {
			return time.Time{}, prevErr
		}

		if prevErr == nil && previousLimit.After(base) {
			base = previousLimit
		}
	}

	calculatedLimit := base.Add(duration)
	if err := s.tryoutRepo.CreateSubtestTimeTx(c, tx, attempt.TryoutAttemptID, subtest, calculatedLimit); err != nil {
		return time.Time{}, err
	}

	resolvedLimit, err := s.tryoutRepo.GetSubtestTimeTx(c, tx, attempt.TryoutAttemptID, subtest)
	if err != nil {
		return time.Time{}, err
	}

	return resolvedLimit, nil
}

func buildUserAnswers(answers []models.AnswerPayload, attemptID int, subtest string) ([]models.UserAnswer, error) {
	userAnswers := make([]models.UserAnswer, 0, len(answers))
	for _, answer := range answers {
		kodeSoal := strings.TrimSpace(answer.KodeSoal)
		if kodeSoal == "" {
			return nil, ErrInvalidAnswerPayload
		}

		jawaban := ""
		if answer.Jawaban != nil {
			jawaban = strings.TrimSpace(*answer.Jawaban)
		}

		if len(answer.JawabanList) > 0 {
			joined, err := normalizeMultiAnswerList(answer.JawabanList)
			if err != nil {
				return nil, ErrInvalidAnswerPayload
			}
			jawaban = joined
		}

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

func normalizeMultiAnswerList(values []string) (string, error) {
	seen := make(map[string]struct{}, len(values))
	cleaned := make([]string, 0, len(values))

	for _, value := range values {
		token := strings.TrimSpace(value)
		if token == "" {
			continue
		}
		if strings.Contains(token, "|") {
			return "", ErrInvalidAnswerPayload
		}
		if _, exists := seen[token]; exists {
			continue
		}
		seen[token] = struct{}{}
		cleaned = append(cleaned, token)
	}

	if len(cleaned) == 0 {
		return "", ErrInvalidAnswerPayload
	}

	sort.Strings(cleaned)
	return strings.Join(cleaned, "|"), nil
}

func resolveNextSubtest(currentSubtest string) (*string, error) {
	for i, sub := range orderedSubtests {
		if sub != currentSubtest {
			continue
		}
		if i == len(orderedSubtests)-1 {
			return nil, nil
		}

		next := orderedSubtests[i+1]
		return &next, nil
	}

	return nil, ErrNoActiveSubtest
}

func resolvePreviousSubtest(currentSubtest string) (*string, error) {
	for i, sub := range orderedSubtests {
		if sub != currentSubtest {
			continue
		}
		if i == 0 {
			return nil, nil
		}

		previous := orderedSubtests[i-1]
		return &previous, nil
	}

	return nil, ErrNoActiveSubtest
}
