package handlers

import (
	"encoding/json"
	"minat-bakat-service/internal/logger"
	"minat-bakat-service/internal/models"
	"minat-bakat-service/internal/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

type MinatBakatHandler struct {
	minatBakatService services.MinatBakatService
}

func NewMinatBakatHandler(minatBakatService services.MinatBakatService) *MinatBakatHandler {
	return &MinatBakatHandler{minatBakatService: minatBakatService}
}

func (h *MinatBakatHandler) GetQuestionsHandler(c *gin.Context) {
	questions, err := h.minatBakatService.GetQuestions(c)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get MB questions")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get MB questions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": questions})
}

func (h *MinatBakatHandler) ProcessMinatBakatHandler(c *gin.Context) {
	userID := c.GetInt("user_id")
	body, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	var req models.SubmitMinatBakatRequest
	if err := json.Unmarshal(body, &req); err == nil && len(req.Answers) > 0 {
		result, svcErr := h.minatBakatService.ProcessMinatBakatAnswers(c, userID, req)
		if svcErr != nil {
			logger.LogErrorCtx(c, svcErr, "Failed to process MB answers", map[string]interface{}{"user_id": userID})
			c.JSON(http.StatusBadRequest, gin.H{"error": svcErr.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"top_interest": result.DNATop, "data": result})
		return
	}

	var legacyAnswers []models.MinatBakatAnswers
	if err := json.Unmarshal(body, &legacyAnswers); err == nil && len(legacyAnswers) > 0 {
		result, svcErr := h.minatBakatService.ProcessLegacyMinatBakatAnswers(c, userID, legacyAnswers)
		if svcErr != nil {
			logger.LogErrorCtx(c, svcErr, "Failed to process legacy MB answers", map[string]interface{}{"user_id": userID})
			c.JSON(http.StatusBadRequest, gin.H{"error": svcErr.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"top_interest": result.DNATop, "data": result})
		return
	}

	c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload format"})
}

func (h *MinatBakatHandler) GetMinatBakatAttemptHandler(c *gin.Context) {
	userID := c.GetInt("user_id")

	attempt, err := h.minatBakatService.GetMinatBakatAttempt(c, userID)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get minat bakat attempt", map[string]interface{}{"user_id": userID})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get minat bakat attempt"})
		return
	}

	c.JSON(http.StatusOK, attempt)
}

func (h *MinatBakatHandler) GetLatestResultHandler(c *gin.Context) {
	userID := c.GetInt("user_id")

	result, err := h.minatBakatService.GetLatestResult(c, userID)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get latest MB result", map[string]interface{}{"user_id": userID})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get latest result"})
		return
	}

	if result == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "result not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}
