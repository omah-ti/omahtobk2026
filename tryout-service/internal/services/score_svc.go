package services

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"net/url"
	"os"
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
	serviceToken   string
}

// NewScoreService is a factory function that returns a new instance of score service
func NewScoreService(scoreRepo repositories.ScoreRepo, soalServiceURL string) ScoreService {
	return &scoreService{
		scoreRepo:      scoreRepo,
		httpClient:     &http.Client{Timeout: 8 * time.Second},
		soalServiceURL: strings.TrimRight(soalServiceURL, "/"),
		serviceToken:   strings.TrimSpace(os.Getenv("INTERNAL_SERVICE_TOKEN")),
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

		rawScore := s.CalculateScore(userAnswers, answerKey)
		maxScore := calculateMaxSubtestScore(answerKey)
		normalizedScore := normalizeSubtestScore(rawScore, maxScore)

		scoreBySubtest[subtest] = normalizedScore
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

// GetAnswerKeyBasedOnSubtestFromSoalService retrieves answer keys through an internal-only endpoint.
func (s *scoreService) GetAnswerKeyBasedOnSubtestFromSoalService(c context.Context, paket, subtest, _ string) (*models.AnswerKeys, error) {
	if strings.TrimSpace(paket) == "" {
		return nil, fmt.Errorf("paket is required")
	}
	if s.serviceToken == "" {
		err := fmt.Errorf("INTERNAL_SERVICE_TOKEN is not configured")
		logger.LogErrorCtx(c, err, "Missing internal service token for answer key request", map[string]interface{}{"subtest": subtest, "paket": paket})
		return nil, err
	}

	requestURL := fmt.Sprintf("%s/internal/soal/answer-key/%s?subtest=%s", s.soalServiceURL, url.PathEscape(strings.TrimSpace(paket)), url.QueryEscape(subtest))
	req, err := http.NewRequestWithContext(c, http.MethodGet, requestURL, nil)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to create request for answer key", map[string]interface{}{"subtest": subtest, "paket": paket})
		return nil, err
	}
	req.Header.Set("X-Service-Token", s.serviceToken)
	req.Header.Set("X-Internal-Request", "true")

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

func calculateMaxSubtestScore(answerKeys *models.AnswerKeys) float64 {
	if answerKeys == nil {
		return 0
	}

	perQuestionBobot := make(map[string]int)

	for kodeSoal, pilihanMap := range answerKeys.PilihanGandaAnswers {
		maxBobot := 0
		for _, pilihan := range pilihanMap {
			if pilihan.Bobot > maxBobot {
				maxBobot = pilihan.Bobot
			}
		}
		if maxBobot > perQuestionBobot[kodeSoal] {
			perQuestionBobot[kodeSoal] = maxBobot
		}
	}

	for kodeSoal, tfAnswer := range answerKeys.TrueFalseAnswers {
		if tfAnswer.Bobot > perQuestionBobot[kodeSoal] {
			perQuestionBobot[kodeSoal] = tfAnswer.Bobot
		}
	}

	for kodeSoal, uraianAnswer := range answerKeys.UraianAnswers {
		if uraianAnswer.Bobot > perQuestionBobot[kodeSoal] {
			perQuestionBobot[kodeSoal] = uraianAnswer.Bobot
		}
	}

	total := 0.0
	for _, bobot := range perQuestionBobot {
		if bobot > 0 {
			total += float64(bobot)
		}
	}

	return total
}

func normalizeSubtestScore(rawScore, maxScore float64) float64 {
	if rawScore <= 0 || maxScore <= 0 {
		return 0
	}

	normalized := (rawScore / maxScore) * 1000
	if normalized > 1000 {
		return 1000
	}

	if normalized < 0 {
		return 0
	}

	return math.Round(normalized*100) / 100
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
				totalScore += scoreByCorrectSetCoverage(userIDs, correctIDs, bobot)
			}
		}

		//check true false
		if tfAnswer, exists := answerKeys.TrueFalseAnswers[kodeSoal]; exists {
			keyBool, keyIsBool := parseLooseBool(tfAnswer.Jawaban)
			if keyIsBool {
				userBool, userIsBool := parseTrueFalseBooleanAnswer(userAnswer.Jawaban)
				if userIsBool && userBool == keyBool {
					totalScore += float64(tfAnswer.Bobot)
				}
			} else {
				keySet := parseAnswerIDSet(tfAnswer.Jawaban)
				if len(keySet) > 0 {
					userSet := parseAnswerIDSet(userAnswer.Jawaban)
					totalScore += scoreByCorrectSetCoverage(userSet, keySet, tfAnswer.Bobot)
				}
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

func scoreByCorrectSetCoverage(userSet, correctSet map[string]struct{}, bobot int) float64 {
	if bobot <= 0 || len(correctSet) == 0 || len(userSet) == 0 {
		return 0
	}

	for selected := range userSet {
		if _, ok := correctSet[selected]; !ok {
			return 0
		}
	}

	matched := 0
	for selected := range userSet {
		if _, ok := correctSet[selected]; ok {
			matched++
		}
	}

	if matched == 0 {
		return 0
	}

	if matched >= len(correctSet) {
		return float64(bobot)
	}

	return float64(bobot) * (float64(matched) / float64(len(correctSet)))
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

func parseTrueFalseBooleanAnswer(raw string) (bool, bool) {
	if parsed, ok := parseLooseBool(raw); ok {
		return parsed, true
	}

	found := false
	value := false

	for _, token := range strings.FieldsFunc(raw, func(r rune) bool {
		return r == '|' || r == ',' || r == ';' || r == '/' || unicode.IsSpace(r)
	}) {
		clean := strings.TrimSpace(token)
		if clean == "" {
			continue
		}

		candidate := clean
		if parts := strings.SplitN(clean, ":", 2); len(parts) == 2 {
			candidate = strings.TrimSpace(parts[1])
		}

		parsed, ok := parseLooseBool(candidate)
		if !ok {
			continue
		}

		if !found {
			found = true
			value = parsed
			continue
		}

		if value != parsed {
			return false, false
		}
	}

	return value, found
}

func isEquivalentTrueFalseAnswer(userRaw, keyRaw string) bool {
	keyBool, keyIsBool := parseLooseBool(keyRaw)
	if keyIsBool {
		userBool, userIsBool := parseTrueFalseBooleanAnswer(userRaw)
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
