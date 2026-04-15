package jwt

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

type AccessTokenClaims struct {
	UserID      int    `json:"user_id"`
	Email       string `json:"email"`
	NamaUser    string `json:"nama_user"`
	AsalSekolah string `json:"asal_sekolah"`
	Role        string `json:"role"`
	jwt.RegisteredClaims
}

func accessTokenSecret() ([]byte, error) {
	secret := os.Getenv("JWT_ACCESS_SECRET")
	if secret == "" {
		return nil, errors.New("JWT_ACCESS_SECRET is not set")
	}

	return []byte(secret), nil
}

func tokenIssuer() (string, error) {
	issuer := strings.TrimSpace(os.Getenv("JWT_ISSUER"))
	if issuer == "" {
		return "", errors.New("JWT_ISSUER is not set")
	}

	return issuer, nil
}

func tokenAudience() string {
	return strings.TrimSpace(os.Getenv("JWT_AUDIENCE"))
}

func accessTokenTTL() time.Duration {
	const defaultMinutes = 60
	raw := strings.TrimSpace(os.Getenv("ACCESS_TOKEN_TTL_MINUTES"))
	if raw == "" {
		return time.Duration(defaultMinutes) * time.Minute
	}

	minutes, err := strconv.Atoi(raw)
	if err != nil || minutes <= 0 {
		return time.Duration(defaultMinutes) * time.Minute
	}

	return time.Duration(minutes) * time.Minute
}

func CreateAccessToken(userID int, namaUser, asalSekolah, email, role string) (string, error) {
	secret, err := accessTokenSecret()
	if err != nil {
		return "", err
	}

	issuer, err := tokenIssuer()
	if err != nil {
		return "", err
	}

	expirationTime := time.Now().Add(accessTokenTTL())
	registeredClaims := jwt.RegisteredClaims{
		ExpiresAt: jwt.NewNumericDate(expirationTime),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		Issuer:    issuer,
	}

	if audience := tokenAudience(); audience != "" {
		registeredClaims.Audience = jwt.ClaimStrings{audience}
	}

	claims := AccessTokenClaims{
		UserID:           userID,
		Email:            email,
		NamaUser:         namaUser,
		AsalSekolah:      asalSekolah,
		Role:             role,
		RegisteredClaims: registeredClaims,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(secret)
}

func CreateRefreshToken() (string, error) {
	bytes := make([]byte, 32)
	_, err := rand.Read(bytes)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func ValidateAccessToken(accessToken string) (*AccessTokenClaims, error) {
	secret, err := accessTokenSecret()
	if err != nil {
		return nil, err
	}

	issuer, err := tokenIssuer()
	if err != nil {
		return nil, err
	}

	token, err := jwt.ParseWithClaims(accessToken, &AccessTokenClaims{}, func(token *jwt.Token) (any, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("unexpected signing method: %s", token.Method.Alg())
		}

		return secret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*AccessTokenClaims); ok && token.Valid {
		if !claims.VerifyIssuer(issuer, true) {
			return nil, fmt.Errorf("invalid token issuer")
		}

		audience := tokenAudience()
		if audience != "" && !claims.VerifyAudience(audience, true) {
			return nil, fmt.Errorf("invalid token audience")
		}

		return claims, nil
	}

	return nil, jwt.ErrTokenInvalidClaims
}

func CreateResetToken() (string, time.Time, error) {
	resetToken, err := CreateRefreshToken()
	if err != nil {
		return "", time.Time{}, err
	}
	resetTokenExpiredAt := time.Now().Add(30 * time.Minute)
	return resetToken, resetTokenExpiredAt, nil
}
