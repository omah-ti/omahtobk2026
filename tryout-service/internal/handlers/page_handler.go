package handlers

import (
	"net/http"
	"tryout-service/internal/logger"
	"tryout-service/internal/services"

	"github.com/gin-gonic/gin"
)

type PageHandler struct {
	pageService services.PageService
}

func NewPageHandler(pageService services.PageService) *PageHandler {
	return &PageHandler{pageService: pageService}
}

func (h *PageHandler) GetLeaderboardHandler(c *gin.Context) {
	leaderboard, err := h.pageService.GetLeaderboard(c)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get leaderboard")
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to get leaderboard", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Leaderboard retrieved successfully", "data": leaderboard})
}

func (h *PageHandler) GetUserSubtestsScore(c *gin.Context) {
	userID := c.GetInt("user_id")
	subtestsScore, err := h.pageService.GetUserSubtestNilai(c, userID)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get subtest score", map[string]interface{}{"user_id": userID})
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to get subtest score", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Subtests scores retrieved successfully", "data": subtestsScore})
}

func (h *PageHandler) GetSubtestsProgressHandler(c *gin.Context) {
	userID := c.GetInt("user_id")
	progress, err := h.pageService.GetSubtestsProgress(c, userID)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get subtests progress", map[string]interface{}{"user_id": userID})
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to get subtests progress", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Subtests progress retrieved successfully", "data": progress})
}

func (h *PageHandler) GetProgressOverviewHandler(c *gin.Context) {
	userID := c.GetInt("user_id")
	username := c.GetString("username")
	school := c.GetString("asal_sekolah")

	overview, err := h.pageService.GetProgressOverview(c, userID, username, school)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get progress overview", map[string]interface{}{"user_id": userID})
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to get progress overview", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Progress overview retrieved successfully", "data": overview})
}

func (h *PageHandler) GetOngoingAttemptHandler(c *gin.Context) {
	userID := c.GetInt("user_id")
	attempt, _ := h.pageService.GetOngoingAttempt(c, userID)
	c.JSON(http.StatusOK, gin.H{"message": "Ongoing attempt retrieved successfully", "data": attempt})
}

func (h *PageHandler) GetFinishedAttemptHandler(c *gin.Context) {
	userID := c.GetInt("user_id")
	attempt, _ := h.pageService.GetFinishedAttempt(c, userID)
	c.JSON(http.StatusOK, gin.H{"message": "Finished attempt retrieved successfully", "data": attempt})
}
