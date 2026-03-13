package repositories

import (
	"auth-service/internal/logger"
	"auth-service/internal/models"
	"context"

	"github.com/jmoiron/sqlx"
)

type RefreshTokenRepo interface {
	StoreRefreshToken(c context.Context, refreshTokenStruct *models.RefreshToken) error
	RevokeRefreshToken(c context.Context, refreshTokenString string) error
	FindValidRefreshToken(c context.Context, refreshTokenString string) (*models.RefreshToken, error)
	RevokeBasedOnUserID(c context.Context, userID int) error
}

type refreshTokenRepo struct {
	db *sqlx.DB
}

func NewTokenRepository(db *sqlx.DB) RefreshTokenRepo {
	return &refreshTokenRepo{db: db}
}

func (r *refreshTokenRepo) StoreRefreshToken(c context.Context, refreshTokenStruct *models.RefreshToken) error {
	query := "INSERT INTO refresh_tokens (user_id, refresh_token_value, expired_at, created_at, revoked) VALUES ($1, $2, $3, $4, $5)"
	_, err := r.db.Exec(query, refreshTokenStruct.UserID, refreshTokenStruct.RefreshTokenValue, refreshTokenStruct.ExpiredAt, refreshTokenStruct.CreatedAt, refreshTokenStruct.Revoked)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to store refresh token")
		return err
	}
	logger.LogDebugCtx(c, "Refresh token stored successfully", map[string]interface{}{"user_id": refreshTokenStruct.UserID})
	return nil
}

func (r *refreshTokenRepo) RevokeRefreshToken(c context.Context, refreshTokenString string) error {
	query := "UPDATE refresh_tokens SET revoked = true WHERE refresh_token_value = $1 AND revoked = false AND expired_at > CURRENT_TIMESTAMP"
	_, err := r.db.Exec(query, refreshTokenString)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to revoke refresh token")
		return err
	}
	logger.LogDebugCtx(c, "Refresh token revoked successfully")
	return nil
}

func (r *refreshTokenRepo) FindValidRefreshToken(c context.Context, refreshTokenString string) (*models.RefreshToken, error) {
	var refreshToken models.RefreshToken
	query := "SELECT * FROM refresh_tokens WHERE refresh_token_value = $1 AND revoked = false AND expired_at > CURRENT_TIMESTAMP"
	err := r.db.Get(&refreshToken, query, refreshTokenString)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to find valid refresh token")
		return nil, err
	}
	logger.LogDebugCtx(c, "Refresh token found")
	return &refreshToken, nil
}

// RevokeBasedOnUserID(userUD int) error query := UPDATE refresh_tokens SET revoked = true WHERE user_id = $1 AND revoked = false AND expired_at > CURRENT_TIMESTAMP
func (r *refreshTokenRepo) RevokeBasedOnUserID(c context.Context, userID int) error {
	query := "UPDATE refresh_tokens SET revoked = true WHERE user_id = $1 AND revoked = false AND expired_at > CURRENT_TIMESTAMP"
	_, err := r.db.Exec(query, userID)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to revoke refresh token", map[string]interface{}{"user_id": userID})
		return err
	}
	logger.LogDebugCtx(c, "Refresh token revoked successfully", map[string]interface{}{"user_id": userID})
	return nil
}
