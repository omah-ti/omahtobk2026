package jwt

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

type AccessTokenClaims struct {
	UserID      int    `json:"user_id"`
	Email       string `json:"email"`
	NamaUser    string `json:"nama_user"`
	AsalSekolah string `json:"asal_sekolah"`
	jwt.RegisteredClaims
}

func accessTokenSecret() ([]byte, error) {
	secret := os.Getenv("JWT_ACCESS_SECRET")
	if secret == "" {
		return nil, errors.New("JWT_ACCESS_SECRET is not set")
	}

	return []byte(secret), nil
}

func CreateAccessToken(userID int, namaUser, asalSekolah, email string) (string, error) {
	secret, err := accessTokenSecret()
	if err != nil {
		return "", err
	}

	expirationTime := time.Now().Add(15 * time.Minute)
	claims := AccessTokenClaims{
		UserID:      userID,
		Email:       email,
		NamaUser:    namaUser,
		AsalSekolah: asalSekolah,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
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
