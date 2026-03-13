package services

import (
	"context"
	"errors"
	"fmt"
	"minat-bakat-service/internal/logger"
	"minat-bakat-service/internal/models"
	"minat-bakat-service/internal/repositories"
	"strconv"
	"strings"
)

type MinatBakatService interface {
	GetQuestions(c context.Context) ([]models.MbQuestion, error)
	ProcessMinatBakatAnswers(c context.Context, userID int, req models.SubmitMinatBakatRequest) (*models.MinatBakatResult, error)
	ProcessLegacyMinatBakatAnswers(c context.Context, userID int, answers []models.MinatBakatAnswers) (*models.MinatBakatResult, error)
	GetMinatBakatAttempt(c context.Context, userID int) (*models.MinatBakatAttempt, error)
	GetLatestResult(c context.Context, userID int) (*models.MinatBakatResult, error)
}

type minatBakatService struct {
	minatBakatRepo repositories.MbRepo
}

func NewMinatBakatService(minatBakatRepo repositories.MbRepo) MinatBakatService {
	return &minatBakatService{minatBakatRepo: minatBakatRepo}
}

const (
	defaultAssessmentVersion = "dna-it-v1"
	defaultScoringVersion    = "scoring-v1"
)

var roleWeights = map[string]map[string]float64{
	"frontend_engineer": {
		"creative":      0.35,
		"communication": 0.25,
		"system":        0.15,
		"analytical":    0.15,
		"detail":        0.10,
	},
	"backend_engineer": {
		"analytical": 0.35,
		"system":     0.30,
		"detail":     0.20,
		"security":   0.15,
	},
	"cyber_security": {
		"security":   0.45,
		"analytical": 0.25,
		"detail":     0.20,
		"system":     0.10,
	},
	"data_engineer": {
		"analytical":    0.35,
		"detail":        0.25,
		"system":        0.25,
		"security":      0.10,
		"communication": 0.05,
	},
	"devops_engineer": {
		"system":        0.35,
		"security":      0.20,
		"analytical":    0.20,
		"detail":        0.15,
		"communication": 0.10,
	},
	"qa_engineer": {
		"detail":        0.35,
		"analytical":    0.25,
		"communication": 0.20,
		"system":        0.20,
	},
	"uiux_designer": {
		"creative":      0.45,
		"communication": 0.30,
		"detail":        0.15,
		"analytical":    0.10,
	},
	"product_manager": {
		"communication": 0.40,
		"analytical":    0.20,
		"creative":      0.20,
		"system":        0.20,
	},
}

func (s *minatBakatService) GetQuestions(c context.Context) ([]models.MbQuestion, error) {
	questions, err := s.minatBakatRepo.GetActiveQuestions(c)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get MB questions")
		return nil, err
	}

	return questions, nil
}

func (s *minatBakatService) ProcessLegacyMinatBakatAnswers(c context.Context, userID int, answers []models.MinatBakatAnswers) (*models.MinatBakatResult, error) {
	converted := make([]models.MbAnswerInput, 0, len(answers))
	for _, ans := range answers {
		likertValue, err := parseLegacyLikert(ans.Jawaban)
		if err != nil {
			return nil, err
		}
		converted = append(converted, models.MbAnswerInput{KodeSoal: ans.KodeSoal, LikertValue: likertValue})
	}

	return s.ProcessMinatBakatAnswers(c, userID, models.SubmitMinatBakatRequest{Answers: converted})
}

func (s *minatBakatService) ProcessMinatBakatAnswers(c context.Context, userID int, req models.SubmitMinatBakatRequest) (*models.MinatBakatResult, error) {
	if len(req.Answers) == 0 {
		return nil, errors.New("answers cannot be empty")
	}

	assessmentVersion := req.AssessmentVersion
	if strings.TrimSpace(assessmentVersion) == "" {
		assessmentVersion = defaultAssessmentVersion
	}

	questions, err := s.minatBakatRepo.GetActiveQuestions(c)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to load MB questions")
		return nil, err
	}
	if len(questions) == 0 {
		return nil, errors.New("no active questions configured")
	}

	questionByID := make(map[int]models.MbQuestion, len(questions))
	questionByCode := make(map[string]models.MbQuestion, len(questions))
	for _, question := range questions {
		questionByID[question.QuestionID] = question
		questionByCode[question.KodeSoal] = question
	}

	seenQuestionID := make(map[int]struct{}, len(req.Answers))
	dimTotals := make(map[string]float64)
	dimCounts := make(map[string]float64)

	for _, answer := range req.Answers {
		if answer.LikertValue < 1 || answer.LikertValue > 5 {
			return nil, fmt.Errorf("likert_value must be between 1 and 5")
		}

		var q models.MbQuestion
		if answer.QuestionID != nil {
			question, ok := questionByID[*answer.QuestionID]
			if !ok {
				return nil, fmt.Errorf("invalid question_id %d", *answer.QuestionID)
			}
			q = question
		} else {
			question, ok := questionByCode[answer.KodeSoal]
			if !ok {
				return nil, fmt.Errorf("invalid kode_soal %s", answer.KodeSoal)
			}
			q = question
		}

		if _, exists := seenQuestionID[q.QuestionID]; exists {
			return nil, fmt.Errorf("duplicate answer for question_id %d", q.QuestionID)
		}
		seenQuestionID[q.QuestionID] = struct{}{}

		scored := answer.LikertValue
		if q.ReverseScored {
			scored = 6 - answer.LikertValue
		}

		dimTotals[q.Dimension] += float64(scored)
		dimCounts[q.Dimension] += 1
	}

	if len(seenQuestionID) != len(questions) {
		return nil, fmt.Errorf("incomplete submission: expected %d answers, got %d", len(questions), len(seenQuestionID))
	}

	dimensionScores := make(map[string]float64, len(dimTotals))
	for dim, total := range dimTotals {
		count := dimCounts[dim]
		if count == 0 {
			continue
		}
		dimensionScores[dim] = total / count
	}

	roleScores := make(map[string]float64, len(roleWeights))
	var (
		topRole  string
		topScore float64
		totalAll float64
	)

	for role, weights := range roleWeights {
		var score float64
		for dim, weight := range weights {
			score += dimensionScores[dim] * weight
		}
		roleScores[role] = score
		totalAll += score
		if score > topScore || topRole == "" {
			topScore = score
			topRole = role
		}
	}

	confidence := 0.0
	if totalAll > 0 {
		confidence = (topScore / totalAll) * 100
	}

	tx, err := s.minatBakatRepo.BeginTransaction(c)
	if err != nil {
		return nil, err
	}
	committed := false
	defer func() {
		if committed {
			return
		}
		if rbErr := tx.Rollback(); rbErr != nil {
			logger.LogErrorCtx(c, rbErr, "Failed to rollback MB transaction")
		}
	}()

	attemptID, err := s.minatBakatRepo.CreateAttemptTx(c, tx, userID, assessmentVersion, defaultScoringVersion)
	if err != nil {
		return nil, err
	}

	if err := s.minatBakatRepo.SaveAttemptAnswersTx(c, tx, attemptID, req.Answers, questionByID, questionByCode); err != nil {
		return nil, err
	}

	result := &models.MinatBakatResult{
		AttemptID:         attemptID,
		UserID:            userID,
		DNATop:            topRole,
		Confidence:        confidence,
		TotalQuestions:    len(questions),
		AssessmentVersion: assessmentVersion,
		ScoringVersion:    defaultScoringVersion,
		DimensionScores:   dimensionScores,
		RoleScores:        roleScores,
	}

	if err := s.minatBakatRepo.SaveResultTx(c, tx, result); err != nil {
		return nil, err
	}

	if err := s.minatBakatRepo.UpsertLegacyAttemptTx(c, tx, userID, topRole); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		logger.LogErrorCtx(c, err, "Failed to commit MB transaction", map[string]interface{}{"user_id": userID})
		return nil, err
	}
	committed = true

	latest, err := s.minatBakatRepo.GetLatestResultByUserID(c, userID)
	if err != nil {
		return nil, err
	}

	return latest, nil
}

func (s *minatBakatService) GetMinatBakatAttempt(c context.Context, userID int) (*models.MinatBakatAttempt, error) {
	attempt, err := s.minatBakatRepo.GetMinatBakatFromUserID(c, userID)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get minat bakat attempt", map[string]interface{}{"user_id": userID})
		return nil, err
	}

	return attempt, nil
}

func (s *minatBakatService) GetLatestResult(c context.Context, userID int) (*models.MinatBakatResult, error) {
	result, err := s.minatBakatRepo.GetLatestResultByUserID(c, userID)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get latest MB result", map[string]interface{}{"user_id": userID})
		return nil, err
	}

	return result, nil
}

func parseLegacyLikert(raw string) (int, error) {
	normalized := strings.ToLower(strings.TrimSpace(raw))
	if normalized == "" {
		return 0, errors.New("legacy jawaban cannot be empty")
	}

	if n, err := strconv.Atoi(normalized); err == nil {
		if n < 1 || n > 5 {
			return 0, errors.New("legacy likert value must be between 1 and 5")
		}
		return n, nil
	}

	mapping := map[string]int{
		"sangat_setuju":       5,
		"setuju":              4,
		"netral":              3,
		"tidak_setuju":        2,
		"sangat_tidak_setuju": 1,
	}

	if val, ok := mapping[normalized]; ok {
		return val, nil
	}

	return 0, fmt.Errorf("unsupported legacy jawaban format: %s", raw)
}
