package utils

import (
	"fmt"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
)

func tokenSecrets() [][]byte {
	secrets := make([][]byte, 0, 2)

	if secret := os.Getenv("JWT_ACCESS_SECRET"); secret != "" {
		secrets = append(secrets, []byte(secret))
	}

	if secret := os.Getenv("JWT_TRYOUT_SECRET"); secret != "" {
		secrets = append(secrets, []byte(secret))
	}

	return secrets
}

func parseToken(tokenStr string) (jwt.MapClaims, error) {
	secrets := tokenSecrets()
	if len(secrets) == 0 {
		return nil, fmt.Errorf("no JWT secret configured")
	}

	for _, secret := range secrets {
		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %s", token.Method.Alg())
			}

			return secret, nil
		})
		if err != nil || !token.Valid {
			continue
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return nil, fmt.Errorf("invalid token claims")
		}

		return claims, nil
	}

	return nil, fmt.Errorf("invalid or expired token")
}

func ValidateJWT() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get token from cookie
		tryoutToken, errTryout := c.Cookie("tryout_token")
		accessToken, errAccess := c.Cookie("access_token")

		var tokenStr string
		if errTryout == nil && tryoutToken != "" {
			tokenStr = tryoutToken
		} else if errAccess == nil && accessToken != "" {
			tokenStr = accessToken
		} else {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "No valid authentication token found"})
			c.Abort()
			return
		}

		claims, err := parseToken(tokenStr)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		c.Set("claims", claims)
		if userID, ok := claims["user_id"]; ok {
			c.Set("user_id", userID)
		}
		if email, ok := claims["email"].(string); ok {
			c.Set("email", email)
		}
		if username, ok := claims["nama_user"].(string); ok {
			c.Set("username", username)
		}
		if asalSekolah, ok := claims["asal_sekolah"].(string); ok {
			c.Set("asal_sekolah", asalSekolah)
		}
		if attemptID, ok := claims["attempt_id"]; ok {
			c.Set("attempt_id", attemptID)
		}

		c.Next()
	}
}
