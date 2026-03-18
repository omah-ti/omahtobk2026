package services

import (
	"auth-service/internal/logger"
	"auth-service/internal/models"
	"auth-service/internal/repositories"
	"auth-service/pkg/utils/jwt"
	"context"
	"time"
)

type RefreshTokenService interface {
	GenerateAccessRefreshTokenPair(c context.Context, userID int) (string, string, error)
	ValidateRefreshToken(c context.Context, refreshToken string) (string, string, error)
	BlacklistRefreshToken(c context.Context, refreshToken string) error
	BlacklistTokenOnEmail(c context.Context, email string) error
}

type refreshTokenService struct {
	refreshTokenRepo repositories.RefreshTokenRepo
	authRepo         repositories.AuthRepo
}

func NewRefreshTokenService(refreshTokenRepo repositories.RefreshTokenRepo, authRepo repositories.AuthRepo) RefreshTokenService {
	return &refreshTokenService{refreshTokenRepo: refreshTokenRepo, authRepo: authRepo}
}

func (s *refreshTokenService) GenerateAccessRefreshTokenPair(c context.Context, userID int) (string, string, error) {
	// Get user using user id so that it can be used to generate the access token
	user, err := s.authRepo.GetUserByID(c, userID)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get user for token pair generation", map[string]interface{}{"user_id": userID})
		return "", "", err
	}

	// generate access token using the user that we fetched
	accessToken, err := jwt.CreateAccessToken(user.UserID, user.NamaUser, user.AsalSekolah, user.Email, user.Role)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to generate access token", map[string]interface{}{"user_id": user.UserID})
		return "", "", err
	}

	// generate opqaue refresh token and later store in the database for later check
	refreshToken, err := jwt.CreateRefreshToken()
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to generate refresh token", map[string]interface{}{"user_id": user.UserID})
		return "", "", err
	}

	// store the refresh token in the database
	err = s.refreshTokenRepo.StoreRefreshToken(c, &models.RefreshToken{
		UserID:            userID,
		RefreshTokenValue: refreshToken,
		ExpiredAt:         time.Now().Add(7 * 24 * time.Hour),
		CreatedAt:         time.Now(),
		Revoked:           false,
	})
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to store refresh token", map[string]interface{}{"user_id": userID})
		return "", "", err
	}
	// return the access token and refresh token for handler or auth service to send to the client
	return accessToken, refreshToken, nil
}

func (s *refreshTokenService) ValidateRefreshToken(c context.Context, refreshTokenString string) (string, string, error) {
	// find the refresh token in the database
	refreshToken, err := s.refreshTokenRepo.FindValidRefreshToken(c, refreshTokenString)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to find valid refresh token")
		return "", "", err
	}

	// revoke the refresh token so that it can't be used again
	err = s.refreshTokenRepo.RevokeRefreshToken(c, refreshTokenString)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to revoke refresh token")
		return "", "", err
	}

	// generate new token pair for the user
	newAccessToken, newRefreshToken, err := s.GenerateAccessRefreshTokenPair(c, refreshToken.UserID)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to generate new token pair", map[string]interface{}{"user_id": refreshToken.UserID})
		return "", "", err
	}

	return newAccessToken, newRefreshToken, nil

}

// sole purpose is for the logout handler to blacklist the refresh token
func (s *refreshTokenService) BlacklistRefreshToken(c context.Context, refreshTokenString string) error {
	// make sure the token is valid
	refreshToken, err := s.refreshTokenRepo.FindValidRefreshToken(c, refreshTokenString)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to find valid refresh token for blacklisting")
		return err
	}

	// revoke the token
	if err := s.refreshTokenRepo.RevokeRefreshToken(c, refreshToken.RefreshTokenValue); err != nil {
		logger.LogErrorCtx(c, err, "Failed to blacklist refresh token")
		return err
	}
	return nil
}

// used when user is requesting password reset
func (s *refreshTokenService) BlacklistTokenOnEmail(c context.Context, email string) error {
	// get the user using the email to get the user id
	user, err := s.authRepo.GetUserByEmail(c, email)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get user by email for blacklisting", map[string]interface{}{"email": email})
		return err
	}

	// revoke all the refresh tokens of the user
	if err := s.refreshTokenRepo.RevokeBasedOnUserID(c, user.UserID); err != nil {
		logger.LogErrorCtx(c, err, "Failed to blacklist refresh token", map[string]interface{}{"user_id": user.UserID})
		return err
	}
	return nil
}
