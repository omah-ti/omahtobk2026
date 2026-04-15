package services

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
	"tryout-service/internal/logger"
	"tryout-service/internal/models"
	"tryout-service/internal/repositories"
	"unicode"
)

type ScoreService interface {
	CalculateAndStoreScores(c context.Context, attemptID, userID int, paket, accessToken string) error
	GetAnswerKeyBasedOnSubtestFromSoalService(c context.Context, paket, subtest, accessToken string) (*models.AnswerKeys, error)
	CalculateScore(userAnswers []models.UserAnswer, answerKeys *models.AnswerKeys) (totalScore float64)
}

// scoreService is a struct that represents the service for score, has a dependency on score repo (injected), http client, and soal service url
type scoreService struct {
	scoreRepo      repositories.ScoreRepo
	httpClient     *http.Client
	soalServiceURL string
}

// NewScoreService is a factory function that returns a new instance of score service
func NewScoreService(scoreRepo repositories.ScoreRepo, soalServiceURL string) ScoreService {
	return &scoreService{
		scoreRepo:      scoreRepo,
		httpClient:     &http.Client{Timeout: 8 * time.Second},
		soalServiceURL: strings.TrimRight(soalServiceURL, "/"),
	}
}

// CalculateAndStoreScores calculates scores first, then writes them in a short transaction.
func (s *scoreService) CalculateAndStoreScores(c context.Context, attemptID, userID int, paket, accessToken string) (retErr error) {
	subtests := []string{"subtest_pu", "subtest_ppu", "subtest_pbm", "subtest_pk", "subtest_lbi", "subtest_lbe", "subtest_pm"}
	scoreBySubtest := make(map[string]float64, len(subtests))

	// Fetch answer keys and calculate scores before opening write transaction.
	for _, subtest := range subtests {
		userAnswers, err := s.scoreRepo.GetUserAnswersFromAttemptIDandSubtest(c, attemptID, subtest)
		if err != nil {
			logger.LogErrorCtx(c, err, "Failed to get user answers from attempt ID and subtest", map[string]interface{}{"attempt_id": attemptID, "subtest": subtest})
			return err
		}

		// get the answer key for this subtest, call the soal service api
		answerKey, err := s.GetAnswerKeyBasedOnSubtestFromSoalService(c, paket, subtest, accessToken)
		if err != nil {
			logger.LogErrorCtx(c, err, "Failed to get answer key from soal service", map[string]interface{}{"subtest": subtest, "paket": paket})
			return err
		}

		scoreBySubtest[subtest] = s.CalculateScore(userAnswers, answerKey)
	}

	tx, err := s.scoreRepo.BeginTransaction(c)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to begin transaction for score write", map[string]interface{}{"attempt_id": attemptID})
		return err
	}

	committed := false
	defer func() {
		if committed {
			return
		}
		if rbErr := tx.Rollback(); rbErr != nil {
			logger.LogErrorCtx(c, rbErr, "Failed to rollback score transaction", map[string]interface{}{"attempt_id": attemptID})
		}
	}()

	for subtest, score := range scoreBySubtest {
		if err := s.scoreRepo.InsertScoreForUserAttemptIDAndSubtestTx(c, tx, attemptID, userID, subtest, score); err != nil {
			logger.LogErrorCtx(c, err, "Failed to insert score for user attempt ID and subtest", map[string]interface{}{
				"attempt_id": attemptID,
				"user_id":    userID,
				"subtest":    subtest,
				"score":      score,
			})

			return err
		}
	}

	averageScore, err := s.scoreRepo.CalculateAverageScoreForAttempt(c, tx, attemptID)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to calculate average score for attempt", map[string]interface{}{"attempt_id": attemptID})
		return err
	}

	if err := s.scoreRepo.UpdateScoreForTryOutAttempt(c, tx, attemptID, averageScore); err != nil {
		logger.LogErrorCtx(c, err, "Failed to update score for tryout attempt", map[string]interface{}{"attempt_id": attemptID})
		return err
	}

	if err := tx.Commit(); err != nil {
		logger.LogErrorCtx(c, err, "Failed to commit score transaction", map[string]interface{}{"attempt_id": attemptID})
		return err
	}
	committed = true

	return nil
}

// make a function that retrieves the answer key from the soal service and the subtest, also distinguish them from the soal type and shit type shit bro
func (s *scoreService) GetAnswerKeyBasedOnSubtestFromSoalService(c context.Context, paket, subtest, accessToken string) (*models.AnswerKeys, error) {
	if strings.TrimSpace(paket) == "" {
		return nil, fmt.Errorf("paket is required")
	}
	requestURL := fmt.Sprintf("%s/soal/answer-key/%s?subtest=%s", s.soalServiceURL, url.PathEscape(strings.TrimSpace(paket)), url.QueryEscape(subtest))
	// make a new request and add cookie to the header
	req, err := http.NewRequestWithContext(c, http.MethodGet, requestURL, nil)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to create request for answer key", map[string]interface{}{"subtest": subtest, "paket": paket})
		return nil, err
	}
	if accessToken == "" {
		err := fmt.Errorf("access token is required")
		logger.LogErrorCtx(c, err, "Missing access token for answer key request", map[string]interface{}{"subtest": subtest, "paket": paket})
		return nil, err
	}
	req.Header.Add("Cookie", fmt.Sprintf("access_token=%s", accessToken))

	// Send the request
	resp, err := s.httpClient.Do(req)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to send request to fetch answer key", map[string]interface{}{"subtest": subtest, "paket": paket})
		return nil, err
	}
	defer resp.Body.Close()

	// Handle non-200 responses
	if resp.StatusCode != http.StatusOK {
		err := fmt.Errorf("unexpected response status: %d", resp.StatusCode)
		logger.LogErrorCtx(c, err, "Unexpected response status when fetching answer key", map[string]interface{}{"subtest": subtest, "paket": paket, "status_code": resp.StatusCode})
		return nil, err
	}

	// Parse the response body
	var answerKey models.AnswerKeys
	if err := json.NewDecoder(resp.Body).Decode(&answerKey); err != nil {
		logger.LogErrorCtx(c, err, "Failed to decode response body for answer key", map[string]interface{}{"subtest": subtest, "paket": paket})
		return nil, err
	}

	// Check if answerKey is empty
	if isAnswerKeyEmpty(answerKey) {
		err := fmt.Errorf("answer key is empty for subtest: %s", subtest)
		logger.LogErrorCtx(c, err, "Empty answer key received", map[string]interface{}{"subtest": subtest, "paket": paket})
		return nil, err
	}

	return &answerKey, nil
}

// isAnswerKeyEmpty checks if the answer key is empty
func isAnswerKeyEmpty(answerKey models.AnswerKeys) bool {
	return len(answerKey.PilihanGandaAnswers) == 0 &&
		len(answerKey.TrueFalseAnswers) == 0 &&
		len(answerKey.UraianAnswers) == 0
}

func (s *scoreService) CalculateScore(userAnswers []models.UserAnswer, answerKeys *models.AnswerKeys) (totalScore float64) {
	totalScore = 0

	for _, userAnswer := range userAnswers { // kode soal dari tabel user answers
		kodeSoal := userAnswer.KodeSoal
		// check pilgan
		if pilihanGandaChoice, exists := answerKeys.PilihanGandaAnswers[kodeSoal]; exists {
			correctIDs := make(map[string]struct{})
			bobot := 0
			for pilihanID, pilihan := range pilihanGandaChoice {
				if !pilihan.IsCorrect {
					continue
				}
				correctIDs[pilihanID] = struct{}{}
				if bobot == 0 {
					bobot = pilihan.Bobot
				}
			}

			if len(correctIDs) > 0 {
				userIDs := parseMultipleChoiceAnswerIDs(userAnswer.Jawaban)
				if equalStringSets(userIDs, correctIDs) {
					totalScore += float64(bobot)
				}
			}
		}

		//check true false
		if tfAnswer, exists := answerKeys.TrueFalseAnswers[kodeSoal]; exists {
			if isEquivalentTrueFalseAnswer(userAnswer.Jawaban, tfAnswer.Jawaban) {
				totalScore += float64(tfAnswer.Bobot)
			}
		}

		// check uraian
		if uraianAnswer, exists := answerKeys.UraianAnswers[kodeSoal]; exists {
			if userAnswer.Jawaban == uraianAnswer.Jawaban {
				totalScore += float64(uraianAnswer.Bobot)
			}
		}
	}
	return totalScore
}

func parseMultipleChoiceAnswerIDs(raw string) map[string]struct{} {
	return parseAnswerIDSet(raw)
}

func parseAnswerIDSet(raw string) map[string]struct{} {
	set := make(map[string]struct{})
	for _, token := range strings.FieldsFunc(raw, func(r rune) bool {
		return r == '|' || r == ',' || r == ';' || r == '/' || unicode.IsSpace(r)
	}) {
		clean := strings.TrimSpace(token)
		if clean == "" {
			continue
		}
		set[clean] = struct{}{}
	}
	return set
}

func parseLooseBool(raw string) (bool, bool) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "true", "1", "yes", "y", "benar":
		return true, true
	case "false", "0", "no", "n", "salah":
		return false, true
	default:
		return false, false
	}
}

func isEquivalentTrueFalseAnswer(userRaw, keyRaw string) bool {
	keyBool, keyIsBool := parseLooseBool(keyRaw)
	if keyIsBool {
		userBool, userIsBool := parseLooseBool(userRaw)
		return userIsBool && userBool == keyBool
	}

	keySet := parseAnswerIDSet(keyRaw)
	if len(keySet) == 0 {
		return false
	}

	userSet := parseAnswerIDSet(userRaw)
	return equalStringSets(userSet, keySet)
}

func equalStringSets(left, right map[string]struct{}) bool {
	if len(left) != len(right) {
		return false
	}
	for key := range left {
		if _, exists := right[key]; !exists {
			return false
		}
	}
	return true
}
