package handlers

import (
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
	userID := c.GetInt("user_id")
	attempt, err := h.tryoutService.GetCurrentAttemptByUserID(c, userID)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to resolve ongoing attempt", map[string]interface{}{"user_id": userID})
		c.JSON(http.StatusNotFound, gin.H{"message": "No ongoing attempt found", "error": err.Error()})
		return nil, false
	}

	return attempt, true
}

func (h *TryoutHandler) StartAttempt(c *gin.Context) {
	// retrieve user_id from context
	userID := c.GetInt("user_id")
	username := c.GetString("username")
	paket := c.Param("paket")
	// start the attempt, making a new record in the database
	attempt, err := h.tryoutService.StartAttempt(c, userID, username, paket)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to start attempt")
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to start attempt", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully started attempt", "data": attempt})
}

func (h *TryoutHandler) SyncHandler(c *gin.Context) {
	userID := c.GetInt("user_id")
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
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to sync answers", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully synced answers", "data": gin.H{"answers": answersInDB, "time_limit": timeLimit}, "attemptID": attemptID, "userID": userID})
}

func (h *TryoutHandler) ProgressTryoutHandler(c *gin.Context) {
	userID := c.GetInt("user_id")
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
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to submit answers", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Successfully get progress or submitted scores", "updated_subtest": updatedSubtest})
}

func (h *TryoutHandler) FinishTryoutHandler(c *gin.Context) {
	userID := c.GetInt("user_id")
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
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to finish tryout", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully finished tryout", "updated_subtest": updatedSubtest})
}

func (h *TryoutHandler) GetCurrentAttempt(c *gin.Context) {
	attempt, ok := h.getOngoingAttempt(c)
	if !ok {
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Successfully get current attempt", "data": attempt})
}
