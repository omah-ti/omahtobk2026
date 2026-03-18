package utils

import (
	"fmt"
	"net/http"
	"os"
	"strings"

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

func tokenIssuer() (string, error) {
	issuer := strings.TrimSpace(os.Getenv("JWT_ISSUER"))
	if issuer == "" {
		return "", fmt.Errorf("JWT_ISSUER is not set")
	}

	return issuer, nil
}

func tokenAudience() string {
	return strings.TrimSpace(os.Getenv("JWT_AUDIENCE"))
}

func claimContainsAudience(claimAud any, expected string) bool {
	if expected == "" {
		return true
	}

	switch aud := claimAud.(type) {
	case string:
		return aud == expected
	case []any:
		for _, v := range aud {
			s, ok := v.(string)
			if ok && s == expected {
				return true
			}
		}
	case []string:
		for _, v := range aud {
			if v == expected {
				return true
			}
		}
	}

	return false
}

func parseToken(tokenStr string) (jwt.MapClaims, error) {
	secrets := tokenSecrets()
	if len(secrets) == 0 {
		return nil, fmt.Errorf("no JWT secret configured")
	}

	issuer, err := tokenIssuer()
	if err != nil {
		return nil, err
	}

	audience := tokenAudience()

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

		issuerClaim, ok := claims["iss"].(string)
		if !ok || issuerClaim != issuer {
			continue
		}

		if audience != "" && !claimContainsAudience(claims["aud"], audience) {
			continue
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
		if errAccess == nil && accessToken != "" {
			tokenStr = accessToken
		} else if errTryout == nil && tryoutToken != "" {
			tokenStr = tryoutToken
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
		if role, ok := claims["role"].(string); ok {
			c.Set("role", strings.ToLower(strings.TrimSpace(role)))
		}
		if attemptID, ok := claims["attempt_id"]; ok {
			c.Set("attempt_id", attemptID)
		}

		c.Next()
	}
}
