package handlers

import (
	"errors"
	"fmt"
	"minat-bakat-service/internal/logger"
	"minat-bakat-service/internal/models"
	"minat-bakat-service/internal/services"
	"net/http"
	"strconv"

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
	userID, err := getUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user context"})
		return
	}

	var req models.SubmitMinatBakatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload format"})
		return
	}

	result, svcErr := h.minatBakatService.ProcessMinatBakatAnswers(c, userID, req)
	if svcErr != nil {
		logger.LogErrorCtx(c, svcErr, "Failed to process MB answers", map[string]interface{}{"user_id": userID})
		c.JSON(http.StatusBadRequest, gin.H{"error": svcErr.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"top_interest": result.DNATop, "data": result})
}

func (h *MinatBakatHandler) GetMinatBakatAttemptHandler(c *gin.Context) {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user context"})
		return
	}

	attempt, err := h.minatBakatService.GetMinatBakatAttempt(c, userID)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get minat bakat attempt", map[string]interface{}{"user_id": userID})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get minat bakat attempt"})
		return
	}

	if attempt == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "attempt not found"})
		return
	}

	c.JSON(http.StatusOK, attempt)
}

func (h *MinatBakatHandler) GetLatestResultHandler(c *gin.Context) {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user context"})
		return
	}

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

func (h *MinatBakatHandler) GetMinatBakatAttemptHistoryHandler(c *gin.Context) {
	userID, err := getUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user context"})
		return
	}

	limit := parseBoundedIntQuery(c, "limit", 10, 1, 50)
	offset := parseBoundedIntQuery(c, "offset", 0, 0, 10000)

	history, err := h.minatBakatService.GetMinatBakatAttemptHistory(c, userID, limit, offset)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get minat bakat attempt history", map[string]interface{}{"user_id": userID, "limit": limit, "offset": offset})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get minat bakat history"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": history})
}

func getUserIDFromContext(c *gin.Context) (int, error) {
	rawUserID, exists := c.Get("user_id")
	if !exists {
		return 0, errors.New("user_id missing in context")
	}

	userID, err := toPositiveInt(rawUserID)
	if err != nil {
		return 0, err
	}

	return userID, nil
}

func toPositiveInt(v interface{}) (int, error) {
	switch val := v.(type) {
	case int:
		if val <= 0 {
			return 0, fmt.Errorf("invalid user_id %d", val)
		}
		return val, nil
	case int32:
		if val <= 0 {
			return 0, fmt.Errorf("invalid user_id %d", val)
		}
		return int(val), nil
	case int64:
		if val <= 0 {
			return 0, fmt.Errorf("invalid user_id %d", val)
		}
		return int(val), nil
	case float64:
		if val <= 0 || val != float64(int(val)) {
			return 0, fmt.Errorf("invalid user_id %v", val)
		}
		return int(val), nil
	case string:
		n, err := strconv.Atoi(val)
		if err != nil || n <= 0 {
			return 0, fmt.Errorf("invalid user_id string")
		}
		return n, nil
	default:
		return 0, fmt.Errorf("unsupported user_id type %T", v)
	}
}

func parseBoundedIntQuery(c *gin.Context, key string, defaultValue, minValue, maxValue int) int {
	raw := c.Query(key)
	if raw == "" {
		return defaultValue
	}

	parsed, err := strconv.Atoi(raw)
	if err != nil {
		return defaultValue
	}

	if parsed < minValue {
		return minValue
	}

	if parsed > maxValue {
		return maxValue
	}

	return parsed
}
