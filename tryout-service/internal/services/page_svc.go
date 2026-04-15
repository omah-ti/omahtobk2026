package services

import (
	"context"
	"fmt"
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
	return s.pageRepo.GetAllSubtestScoreForAUser(c, userId)
}

func (s *pageService) GetSubtestsProgress(c context.Context, userID int) (*models.SubtestsProgressResponse, error) {
	orderedSubtests := []struct {
		Key  string
		Name string
	}{
		{Key: "subtest_pu", Name: "Penalaran Umum"},
		{Key: "subtest_ppu", Name: "Pengetahuan dan Pemahaman Umum"},
		{Key: "subtest_pbm", Name: "Pemahaman Bacaan dan Menulis"},
		{Key: "subtest_pk", Name: "Pengetahuan Kuantitatif"},
		{Key: "subtest_lbi", Name: "Literasi dalam Bahasa Indonesia"},
		{Key: "subtest_lbe", Name: "Literasi dalam Bahasa Inggris"},
		{Key: "subtest_pm", Name: "Penalaran Matematika"},
	}

	userScores, err := s.pageRepo.GetAllSubtestScoreForAUser(c, userID)
	if err != nil {
		return nil, err
	}

	ongoingAttempt, err := s.pageRepo.GetOngoingAttemptByUserID(c, userID)
	if err != nil {
		ongoingAttempt = nil
	}

	attemptStatus := "not_started"
	currentSubtest := ""
	if ongoingAttempt != nil {
		attemptStatus = "ongoing"
		currentSubtest = ongoingAttempt.SubtestSekarang
	} else if len(userScores) > 0 {
		attemptStatus = "finished"
	}

	scoreMap := make(map[string]float64, len(userScores))
	for _, score := range userScores {
		scoreMap[score.Subtest] = score.Score
	}

	rows := make([]models.SubtestProgressRow, 0, len(orderedSubtests))
	completed := 0
	currentIndex := -1
	for idx, sub := range orderedSubtests {
		if sub.Key == currentSubtest {
			currentIndex = idx
			break
		}
	}

	for i, sub := range orderedSubtests {
		scoreValue, hasScore := scoreMap[sub.Key]
		row := models.SubtestProgressRow{
			Order:       i + 1,
			SubtestKey:  sub.Key,
			SubtestName: sub.Name,
			ScoreMax:    1000,
			ScoreText:   "-",
			ActionRoute: "/tryout/intro",
		}

		if hasScore {
			completed++
			row.ScoreValue = &scoreValue
			row.ScoreText = fmt.Sprintf("%.0f/1000", scoreValue)
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
			TotalSubtests:     len(orderedSubtests),
			CompletedSubtests: completed,
			CurrentSubtest:    currentSubtest,
			AttemptStatus:     attemptStatus,
		},
		Rows: rows,
	}, nil
}

func (s *pageService) GetProgressOverview(c context.Context, userID int, username, school string) (*models.ProgressOverviewResponse, error) {
	orderedSubtests := []struct {
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

	scores, err := s.pageRepo.GetAllSubtestScoreForAUser(c, userID)
	if err != nil {
		return nil, err
	}

	scoreMap := make(map[string]float64, len(scores))
	var total float64
	for _, sc := range scores {
		scoreMap[sc.Subtest] = sc.Score
		total += sc.Score
	}

	completed := len(scoreMap)
	avg := 0.0
	if completed > 0 {
		avg = total / float64(completed)
	}

	strongest := models.ProgressOverviewInsightItem{ScoreText: "-"}
	for _, sub := range orderedSubtests {
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
	for _, sub := range orderedSubtests {
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
	if ongoing, err := s.pageRepo.GetOngoingAttemptByUserID(c, userID); err == nil && ongoing != nil {
		paket = ongoing.Paket
	}
	if paket == "" {
		if finished, err := s.pageRepo.GetFinishedAttemptByUserID(c, userID); err == nil && finished != nil {
			paket = finished.Paket
		}
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
			TotalSubtests:     len(orderedSubtests),
			ProgressText:      fmt.Sprintf("%d / %d subtest", completed, len(orderedSubtests)),
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
