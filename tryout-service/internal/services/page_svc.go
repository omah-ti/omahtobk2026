package services

import (
	"context"
	"fmt"
	"math"
	"time"
	"tryout-service/internal/logger"
	"tryout-service/internal/models"
	"tryout-service/internal/repositories"
)

type PageService interface {
	GetLeaderboard(c context.Context) ([]models.TryoutAttempt, error)
	GetUserSubtestNilai(c context.Context, userId int) ([]models.UserScore, error)
	GetSubtestsProgress(c context.Context, userID int) (*models.SubtestsProgressResponse, error)
	GetProgressOverview(c context.Context, userID int, username, school string) (*models.ProgressOverviewResponse, error)
	GetScoreAndRank(c context.Context, userID int, paket string) (float64, int, error)
	GetOngoingAttempt(c context.Context, userID int) (*models.TryoutAttempt, error)
	GetFinishedAttempt(c context.Context, userID int) (*models.TryoutAttempt, error)
}

type pageService struct {
	pageRepo     repositories.PageRepo
	scoreService ScoreService
	tryoutRepo   repositories.TryoutRepo
}

var orderedProgressSubtests = []struct {
	Key  string
	Name string
}{
	{Key: "subtest_pu", Name: "Kemampuan Penalaran Umum"},
	{Key: "subtest_ppu", Name: "Pengetahuan dan Pemahaman Umum"},
	{Key: "subtest_pbm", Name: "Kemampuan Memahami Bacaan dan Menulis"},
	{Key: "subtest_pk", Name: "Pengetahuan Kuantitatif"},
	{Key: "subtest_lbi", Name: "Literasi dalam Bahasa Indonesia"},
	{Key: "subtest_lbe", Name: "Literasi dalam Bahasa Inggris"},
	{Key: "subtest_pm", Name: "Penalaran Matematika"},
}

func clampSubtestScore(score float64) float64 {
	if score < 0 {
		return 0
	}
	if score > 1000 {
		return 1000
	}
	return score
}

func formatSubtestScoreText(score float64) string {
	rounded := math.Round(score)
	if math.Abs(score-rounded) < 0.005 {
		return fmt.Sprintf("%.0f/1000", rounded)
	}

	return fmt.Sprintf("%.2f/1000", score)
}

func resolveJakartaLocation(c context.Context) *time.Location {
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err == nil {
		return loc
	}

	logger.LogDebugCtx(c, "Failed to load Asia/Jakarta timezone, using fixed UTC+7 fallback", map[string]interface{}{"error": err.Error()})
	return time.FixedZone("Asia/Jakarta", 7*60*60)
}

func NewPageService(pageRepo repositories.PageRepo, scoreService ScoreService, tryoutRepo repositories.TryoutRepo) PageService {
	return &pageService{pageRepo: pageRepo, scoreService: scoreService, tryoutRepo: tryoutRepo}
}

func (s *pageService) GetLeaderboard(c context.Context) ([]models.TryoutAttempt, error) {
	return s.pageRepo.GetTop4Leaderboard(c)
}

func (s *pageService) GetUserSubtestNilai(c context.Context, userId int) ([]models.UserScore, error) {
	ongoingAttempt, err := s.pageRepo.GetOngoingAttemptByUserID(c, userId)
	if err == nil && ongoingAttempt != nil {
		if _, err := s.ensureAttemptScoresReady(c, userId, ongoingAttempt); err != nil {
			logger.LogErrorCtx(c, err, "Failed to refresh subtest scores for ongoing attempt", map[string]interface{}{
				"user_id":    userId,
				"attempt_id": ongoingAttempt.TryoutAttemptID,
			})
		}
	}

	return s.pageRepo.GetAllSubtestScoreForAUser(c, userId)
}

func (s *pageService) GetSubtestsProgress(c context.Context, userID int) (*models.SubtestsProgressResponse, error) {
	actionRoutes := map[string]string{
		"subtest_pu":  "/tryout/penalaran-umum",
		"subtest_ppu": "/tryout/pengetahuan-dan-pemahaman-umum",
		"subtest_pbm": "/tryout/pemahaman-bacaan-dan-menulis",
		"subtest_pk":  "/tryout/pengetahuan-kuantitatif",
		"subtest_lbi": "/tryout/literasi-bahasa-indonesia",
		"subtest_lbe": "/tryout/literasi-bahasa-inggris",
		"subtest_pm":  "/tryout/penalaran-matematika",
	}

	ongoingAttempt, err := s.pageRepo.GetOngoingAttemptByUserID(c, userID)
	if err != nil {
		ongoingAttempt = nil
	}

	finishedAttempt, err := s.pageRepo.GetFinishedAttemptByUserID(c, userID)
	if err != nil {
		finishedAttempt = nil
	}

	attemptStatus := "not_started"
	currentSubtest := ""
	targetAttemptID := 0
	var userScores []models.UserScore

	if ongoingAttempt != nil {
		attemptStatus = "ongoing"
		currentSubtest = ongoingAttempt.SubtestSekarang
		targetAttemptID = ongoingAttempt.TryoutAttemptID
		userScores, err = s.ensureAttemptScoresReady(c, userID, ongoingAttempt)
		if err != nil {
			return nil, err
		}
	} else if finishedAttempt != nil {
		attemptStatus = "finished"
		targetAttemptID = finishedAttempt.TryoutAttemptID
		userScores, err = s.ensureAttemptScoresReady(c, userID, finishedAttempt)
		if err != nil {
			return nil, err
		}
	} else {
		userScores, err = s.pageRepo.GetAllSubtestScoreForAUser(c, userID)
		if err != nil {
			return nil, err
		}
	}

	scoreMap := make(map[string]float64, len(userScores))
	for _, score := range userScores {
		if targetAttemptID > 0 && score.TryoutAttemptID != targetAttemptID {
			continue
		}
		scoreMap[score.Subtest] = score.Score
	}

	rows := make([]models.SubtestProgressRow, 0, len(orderedProgressSubtests))
	completed := 0
	currentIndex := -1
	for idx, sub := range orderedProgressSubtests {
		if sub.Key == currentSubtest {
			currentIndex = idx
			break
		}
	}

	for i, sub := range orderedProgressSubtests {
		scoreValue, hasScore := scoreMap[sub.Key]
		row := models.SubtestProgressRow{
			Order:       i + 1,
			SubtestKey:  sub.Key,
			SubtestName: sub.Name,
			ScoreMax:    1000,
			ScoreText:   "-",
			ActionRoute: actionRoutes[sub.Key],
		}

		isCompleted := false
		switch attemptStatus {
		case "ongoing":
			isCompleted = currentIndex >= 0 && i < currentIndex
		case "finished":
			isCompleted = hasScore
		}

		if isCompleted {
			completed++
			if hasScore {
				cappedScore := clampSubtestScore(scoreValue)
				row.ScoreValue = &cappedScore
				row.ScoreText = formatSubtestScoreText(cappedScore)
			}
			row.StatusLabel = "Selesai"
			row.ActionLabel = "Lihat Hasil"
			row.IsLocked = false
			rows = append(rows, row)
			continue
		}

		row.IsCurrent = ongoingAttempt != nil && sub.Key == currentSubtest

		switch {
		case row.IsCurrent:
			row.StatusLabel = "Belum Dikerjakan"
			row.ActionLabel = "Mulai Kerjakan"
			row.IsLocked = false
		case currentIndex >= 0 && i > currentIndex:
			row.StatusLabel = "Kerjakan Subtest Terakhir"
			row.ActionLabel = "Mulai Kerjakan"
			row.IsLocked = true
		case currentIndex >= 0 && i < currentIndex:
			row.StatusLabel = "Belum Dikerjakan"
			row.ActionLabel = "Mulai Kerjakan"
			row.IsLocked = true
		case ongoingAttempt == nil && completed == 0 && i == 0:
			row.StatusLabel = "Belum Dikerjakan"
			row.ActionLabel = "Mulai Kerjakan"
			row.IsLocked = false
		default:
			row.StatusLabel = "Kerjakan Subtest Terakhir"
			row.ActionLabel = "Mulai Kerjakan"
			row.IsLocked = true
		}

		rows = append(rows, row)
	}

	return &models.SubtestsProgressResponse{
		Summary: models.SubtestsProgressSummary{
			TotalSubtests:     len(orderedProgressSubtests),
			CompletedSubtests: completed,
			CurrentSubtest:    currentSubtest,
			AttemptStatus:     attemptStatus,
		},
		Rows: rows,
	}, nil
}

func (s *pageService) GetProgressOverview(c context.Context, userID int, username, school string) (*models.ProgressOverviewResponse, error) {
	var targetAttempt *models.TryoutAttempt
	if ongoing, err := s.pageRepo.GetOngoingAttemptByUserID(c, userID); err == nil && ongoing != nil {
		targetAttempt = ongoing
	} else if finished, err := s.pageRepo.GetFinishedAttemptByUserID(c, userID); err == nil && finished != nil {
		targetAttempt = finished
	}

	var scores []models.UserScore
	var err error
	if targetAttempt != nil {
		scores, err = s.ensureAttemptScoresReady(c, userID, targetAttempt)
		if err != nil {
			return nil, err
		}
	} else {
		scores, err = s.pageRepo.GetAllSubtestScoreForAUser(c, userID)
		if err != nil {
			return nil, err
		}
	}

	scoreMap := make(map[string]float64, len(scores))
	var total float64
	for _, sc := range scores {
		if targetAttempt != nil && sc.TryoutAttemptID != targetAttempt.TryoutAttemptID {
			continue
		}
		scoreMap[sc.Subtest] = sc.Score
		total += sc.Score
	}

	completed := len(scoreMap)
	avg := 0.0
	if completed > 0 {
		avg = total / float64(completed)
	}

	strongest := models.ProgressOverviewInsightItem{ScoreText: "-"}
	for _, sub := range orderedProgressSubtests {
		if val, ok := scoreMap[sub.Key]; ok {
			if strongest.Score == nil || val > *strongest.Score {
				v := val
				strongest = models.ProgressOverviewInsightItem{
					SubtestKey:  sub.Key,
					SubtestName: sub.Name,
					Score:       &v,
					ScoreText:   fmt.Sprintf("%.0f", v),
				}
			}
		}
	}

	focus := models.ProgressOverviewInsightItem{ScoreText: "-"}
	for _, sub := range orderedProgressSubtests {
		if _, ok := scoreMap[sub.Key]; !ok {
			focus = models.ProgressOverviewInsightItem{
				SubtestKey:  sub.Key,
				SubtestName: sub.Name,
				Score:       nil,
				ScoreText:   "-",
			}
			break
		}
	}

	leaderboards, err := s.pageRepo.GetTop4Leaderboard(c)
	if err != nil {
		return nil, err
	}
	topN := make([]models.ProgressOverviewLeaderboardEntry, 0, len(leaderboards))
	for i, lb := range leaderboards {
		score := 0.0
		if lb.TryoutScore != nil {
			score = *lb.TryoutScore
		}
		topN = append(topN, models.ProgressOverviewLeaderboardEntry{
			Rank:     i + 1,
			Username: lb.Username,
			Score:    score,
		})
	}

	var paket string
	if targetAttempt != nil {
		paket = targetAttempt.Paket
	}
	if paket == "" {
		paket = "paket1"
	}

	var currentRank *int
	var currentScore *float64
	if completed > 0 {
		score, rank, err := s.pageRepo.GetScoreAndRank(c, userID, paket)
		if err == nil {
			currentRank = &rank
			currentScore = &score
		}
	}

	loc := resolveJakartaLocation(c)
	startAt := time.Date(2026, time.April, 21, 0, 0, 0, 0, loc)
	endAt := time.Date(2026, time.April, 30, 23, 59, 59, 0, loc)

	return &models.ProgressOverviewResponse{
		Profile: models.ProgressOverviewProfile{
			UserID: userID,
			Name:   username,
			School: school,
		},
		Statistics: models.ProgressOverviewStatistics{
			AverageScore:      avg,
			CompletedSubtests: completed,
			TotalSubtests:     len(orderedProgressSubtests),
			ProgressText:      fmt.Sprintf("%d / %d subtest", completed, len(orderedProgressSubtests)),
		},
		Insight: models.ProgressOverviewInsight{
			StrongestSubtest: strongest,
			FocusSubtest:     focus,
		},
		Leaderboard: models.ProgressOverviewLeaderboard{
			TopN:             topN,
			CurrentUserRank:  currentRank,
			CurrentUserScore: currentScore,
		},
		UTBK: models.ProgressOverviewUTBK{
			Label:      "Pelaksanaan UTBK",
			StartAt:    startAt,
			EndAt:      endAt,
			ServerTime: time.Now().In(loc),
		},
	}, nil
}

func (s *pageService) GetScoreAndRank(c context.Context, userID int, paket string) (float64, int, error) {
	return s.pageRepo.GetScoreAndRank(c, userID, paket)
}

func (s *pageService) GetOngoingAttempt(c context.Context, userID int) (*models.TryoutAttempt, error) {
	return s.pageRepo.GetOngoingAttemptByUserID(c, userID)
}

func (s *pageService) GetFinishedAttempt(c context.Context, userID int) (*models.TryoutAttempt, error) {
	return s.pageRepo.GetFinishedAttemptByUserID(c, userID)
}

func (s *pageService) ensureAttemptScoresReady(c context.Context, userID int, attempt *models.TryoutAttempt) ([]models.UserScore, error) {
	scores, err := s.pageRepo.GetAllSubtestScoreForAUser(c, userID)
	if err != nil {
		return nil, err
	}

	if attempt == nil {
		return scores, nil
	}

	expectedCompletedScores := completedSubtestCountForAttempt(attempt)
	if expectedCompletedScores <= 0 {
		return scores, nil
	}

	filteredCount := 0
	for _, score := range scores {
		if score.TryoutAttemptID == attempt.TryoutAttemptID {
			filteredCount++
		}
	}

	if filteredCount >= expectedCompletedScores {
		return scores, nil
	}

	if err := s.scoreService.CalculateAndStoreScores(c, attempt.TryoutAttemptID, userID, attempt.Paket, ""); err != nil {
		logger.LogErrorCtx(c, err, "Failed to calculate and store scores while serving progress", map[string]interface{}{
			"user_id":    userID,
			"attempt_id": attempt.TryoutAttemptID,
			"paket":      attempt.Paket,
		})
		// Keep progress endpoints available even when score refresh cannot reach the
		// answer-key service. Existing scores, if any, are still returned.
		return scores, nil
	}

	return s.pageRepo.GetAllSubtestScoreForAUser(c, userID)
}

func completedSubtestCountForAttempt(attempt *models.TryoutAttempt) int {
	if attempt == nil {
		return 0
	}

	if attempt.Status == "finished" {
		return len(orderedProgressSubtests)
	}

	for index, sub := range orderedProgressSubtests {
		if sub.Key == attempt.SubtestSekarang {
			return index
		}
	}

	return 0
}
