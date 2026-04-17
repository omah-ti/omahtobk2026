package utils

import (
	"crypto/subtle"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

const internalServiceTokenHeader = "X-Service-Token"

func RequireInternalServiceToken() gin.HandlerFunc {
	expectedToken := strings.TrimSpace(os.Getenv("INTERNAL_SERVICE_TOKEN"))

	return func(c *gin.Context) {
		if expectedToken == "" {
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{"error": "internal service token is not configured"})
			return
		}

		providedToken := strings.TrimSpace(c.GetHeader(internalServiceTokenHeader))
		if providedToken == "" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "invalid internal token"})
			return
		}

		if subtle.ConstantTimeCompare([]byte(providedToken), []byte(expectedToken)) != 1 {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "invalid internal token"})
			return
		}

		c.Next()
	}
}
