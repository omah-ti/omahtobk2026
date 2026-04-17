package handlers

import (
	"database/sql"
	"errors"
	"net/http"
	"tryout-service/internal/logger"
	"tryout-service/internal/models"
	"tryout-service/internal/services"

	"github.com/gin-gonic/gin"
)

type TryoutHandler struct {
	tryoutService services.TryoutService
}

func NewTryoutHandler(tryoutService services.TryoutService) *TryoutHandler {
	return &TryoutHandler{tryoutService: tryoutService}
}

func (h *TryoutHandler) getOngoingAttempt(c *gin.Context) (*models.TryoutAttempt, bool) {
	userID, ok := getAuthUserID(c)
	if !ok {
		return nil, false
	}
	attempt, err := h.tryoutService.GetCurrentAttemptByUserID(c, userID)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to resolve ongoing attempt", map[string]interface{}{"user_id": userID})
		writeTryoutError(c, err, "No ongoing attempt found")
		return nil, false
	}

	return attempt, true
}

func (h *TryoutHandler) StartAttempt(c *gin.Context) {
	// retrieve user_id from context
	userID, ok := getAuthUserID(c)
	if !ok {
		return
	}
	username := c.GetString("username")
	paket := c.Param("paket")
	// start the attempt, making a new record in the database
	attempt, err := h.tryoutService.StartAttempt(c, userID, username, paket)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to start attempt")
		writeTryoutError(c, err, "Failed to start attempt")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully started attempt", "data": attempt})
}

func (h *TryoutHandler) StartSubtestHandler(c *gin.Context) {
	attempt, ok := h.getOngoingAttempt(c)
	if !ok {
		return
	}

	subtest := c.Param("subtest")
	answersInDB, timeLimit, err := h.tryoutService.StartSubtest(c, attempt.TryoutAttemptID, subtest)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to start subtest", map[string]interface{}{"subtest": subtest, "attempt_id": attempt.TryoutAttemptID})
		writeTryoutError(c, err, "Failed to start subtest")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Successfully started subtest",
		"data": gin.H{
			"subtest":    subtest,
			"answers":    answersInDB,
			"time_limit": timeLimit,
		},
	})
}

func (h *TryoutHandler) SaveSubtestAnswersHandler(c *gin.Context) {
	attempt, ok := h.getOngoingAttempt(c)
	if !ok {
		return
	}

	subtest := c.Param("subtest")
	var payload struct {
		Answers []models.AnswerPayload `json:"answers" binding:"omitempty,dive"`
	}

	if err := c.ShouldBindJSON(&payload); err != nil {
		logger.LogErrorCtx(c, err, "Invalid input for save subtest answers")
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid input", "error": err.Error()})
		return
	}

	answersInDB, timeLimit, err := h.tryoutService.SaveSubtestAnswers(c, payload.Answers, attempt.TryoutAttemptID, subtest)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to save subtest answers", map[string]interface{}{"subtest": subtest, "attempt_id": attempt.TryoutAttemptID})
		writeTryoutError(c, err, "Failed to save subtest answers")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Successfully saved subtest answers",
		"data": gin.H{
			"subtest":    subtest,
			"answers":    answersInDB,
			"time_limit": timeLimit,
		},
	})
}

func (h *TryoutHandler) SubmitSubtestHandler(c *gin.Context) {
	userID, ok := getAuthUserID(c)
	if !ok {
		return
	}
	attempt, ok := h.getOngoingAttempt(c)
	if !ok {
		return
	}

	accessToken, err := c.Cookie("access_token")
	if err != nil || accessToken == "" {
		logger.LogErrorCtx(c, err, "Failed to get access token")
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Access token is required"})
		return
	}

	subtest := c.Param("subtest")
	var payload struct {
		Answers []models.AnswerPayload `json:"answers" binding:"omitempty,dive"`
	}

	if err := c.ShouldBindJSON(&payload); err != nil {
		logger.LogErrorCtx(c, err, "Invalid input for submit subtest")
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid input", "error": err.Error()})
		return
	}

	updatedSubtest, err := h.tryoutService.SubmitSubtest(c, payload.Answers, attempt.TryoutAttemptID, userID, accessToken, subtest)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to submit subtest", map[string]interface{}{"subtest": subtest, "attempt_id": attempt.TryoutAttemptID})
		writeTryoutError(c, err, "Failed to submit subtest")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":         "Successfully submitted subtest",
		"updated_subtest": updatedSubtest,
		"next_action":     "return_dashboard",
	})
}

func (h *TryoutHandler) SyncHandler(c *gin.Context) {
	userID, ok := getAuthUserID(c)
	if !ok {
		return
	}
	attempt, ok := h.getOngoingAttempt(c)
	if !ok {
		return
	}
	attemptID := attempt.TryoutAttemptID
	var answers struct {
		Answers []models.AnswerPayload `json:"answers" binding:"required,dive"`
	}

	if err := c.ShouldBindJSON(&answers); err != nil {
		logger.LogErrorCtx(c, err, "Invalid input for sync handler")
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid input", "error": err.Error()})
		return
	}
	answersInDB, timeLimit, err := h.tryoutService.SyncWithDatabase(c, answers.Answers, attemptID)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to sync answers")
		writeTryoutError(c, err, "Failed to sync answers")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully synced answers", "data": gin.H{"answers": answersInDB, "time_limit": timeLimit}, "attemptID": attemptID, "userID": userID})
}

func (h *TryoutHandler) ProgressTryoutHandler(c *gin.Context) {
	userID, ok := getAuthUserID(c)
	if !ok {
		return
	}
	attempt, ok := h.getOngoingAttempt(c)
	if !ok {
		return
	}
	attemptID := attempt.TryoutAttemptID
	accessToken, err := c.Cookie("access_token")
	if err != nil || accessToken == "" {
		logger.LogErrorCtx(c, err, "Failed to get access token")
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Access token is required"})
		return
	}
	var answers struct {
		Answers []models.AnswerPayload `json:"answers" binding:"required,dive"`
	}

	if err := c.ShouldBindJSON(&answers); err != nil {
		logger.LogErrorCtx(c, err, "Invalid input for progress handler")
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid input", "error": err.Error()})
		return
	}

	updatedSubtest, err := h.tryoutService.SubmitCurrentSubtest(c, answers.Answers, attemptID, userID, accessToken)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to submit answers")
		writeTryoutError(c, err, "Failed to submit answers")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message":         "Successfully get progress or submitted scores",
		"updated_subtest": updatedSubtest,
		"next_action":     "return_dashboard",
	})
}

func (h *TryoutHandler) FinishTryoutHandler(c *gin.Context) {
	userID, ok := getAuthUserID(c)
	if !ok {
		return
	}
	attempt, ok := h.getOngoingAttempt(c)
	if !ok {
		return
	}
	attemptID := attempt.TryoutAttemptID
	accessToken, err := c.Cookie("access_token")
	if err != nil || accessToken == "" {
		logger.LogErrorCtx(c, err, "Failed to get access token")
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Access token is required"})
		return
	}

	var answers struct {
		Answers []models.AnswerPayload `json:"answers" binding:"required,dive"`
	}

	if err := c.ShouldBindJSON(&answers); err != nil {
		logger.LogErrorCtx(c, err, "Invalid input for finish handler")
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid input", "error": err.Error()})
		return
	}

	updatedSubtest, err := h.tryoutService.FinishTryoutNow(c, answers.Answers, attemptID, userID, accessToken)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to finish tryout early")
		writeTryoutError(c, err, "Failed to finish tryout")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":         "Successfully finished tryout",
		"updated_subtest": updatedSubtest,
		"next_action":     "return_dashboard",
	})
}

func (h *TryoutHandler) GetCurrentAttempt(c *gin.Context) {
	attempt, ok := h.getOngoingAttempt(c)
	if !ok {
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Successfully get current attempt", "data": attempt})
}

func getAuthUserID(c *gin.Context) (int, bool) {
	userID := c.GetInt("user_id")
	if userID <= 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid authentication context"})
		return 0, false
	}

	return userID, true
}

func writeTryoutError(c *gin.Context, err error, fallbackMessage string) {
	status := http.StatusInternalServerError
	message := fallbackMessage

	switch {
	case errors.Is(err, services.ErrAuthContextInvalid):
		status = http.StatusUnauthorized
		message = "Invalid authentication context"
	case errors.Is(err, services.ErrAttemptNotFound), errors.Is(err, sql.ErrNoRows):
		status = http.StatusNotFound
		message = "No ongoing attempt found"
	case errors.Is(err, services.ErrAttemptAlreadyOngoing):
		status = http.StatusConflict
		message = "You already have an ongoing attempt"
	case errors.Is(err, services.ErrInvalidAnswerPayload):
		status = http.StatusBadRequest
		message = "Invalid input"
	case errors.Is(err, services.ErrAttemptEnded), errors.Is(err, services.ErrAttemptNotOngoing), errors.Is(err, services.ErrNoActiveSubtest):
		status = http.StatusConflict
		message = "Tryout attempt state is no longer valid"
	case errors.Is(err, services.ErrTimeLimitReached):
		status = http.StatusGone
		message = "Time limit has been reached"
	case errors.Is(err, services.ErrScoringFailed):
		status = http.StatusServiceUnavailable
		message = "Tryout finalized but scoring is not available yet"
	case errors.Is(err, services.ErrSubtestOutOfOrder):
		status = http.StatusConflict
		message = "Subtest is not active yet"
	}

	c.JSON(status, gin.H{"message": message, "error": err.Error()})
}
