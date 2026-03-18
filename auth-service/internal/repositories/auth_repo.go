package repositories

import (
	"auth-service/internal/logger"
	"auth-service/internal/models"
	"errors"
	"time"

	"context"

	"github.com/jmoiron/sqlx"
)

var ErrInvalidOrExpiredResetToken = errors.New("invalid or expired reset token")

// Must implement all methods in the interface
type AuthRepo interface {
	CreateUser(c context.Context, user *models.User) error
	GetUserByEmail(c context.Context, email string) (*models.User, error)
	GetUserByID(c context.Context, userID int) (*models.User, error)
	ResetPassword(c context.Context, newPassword, resetToken string) error
	RequestingPasswordReset(c context.Context, email, resetToken string, resetTokenExpiredAt time.Time) error
}

type authRepo struct {
	db *sqlx.DB // Depends on a database connection
}

// Constructor for authRepo that returns the interface
func NewAuthRepo(db *sqlx.DB) AuthRepo {
	// return the pointer to a struct with the database connection
	return &authRepo{db: db}
}

// This function implements the CreateUser method from the AuthRepo interface, it creates a new user in the database, accepts the user models as the params, and returns an error if the query fails
func (r *authRepo) CreateUser(c context.Context, user *models.User) error {
	// Define the query to insert a new user
	query := "INSERT INTO users (email, nama_user, password, asal_sekolah, role) VALUES ($1, $2, $3, $4, $5) RETURNING user_id"
	// Execute the query and scan the result into the user struct
	err := r.db.QueryRow(query, user.Email, user.NamaUser, user.Password, user.AsalSekolah, user.Role).Scan(&user.UserID)
	if err != nil {
		// Log the error if the query fails
		logger.LogErrorCtx(c, err, "Failed to insert user")
		return err
	}
	// Log the success if the query succeeds (this wont be logged in production)
	logger.LogDebugCtx(c, "User created successfully")
	return nil
}

func (r *authRepo) GetUserByEmail(c context.Context, email string) (*models.User, error) {
	// Create a new user struct to store the result
	var user models.User
	query := "SELECT user_id, email, nama_user, asal_sekolah, role, password FROM users WHERE email = $1"
	// Get the user struct from the database using the query and the username
	err := r.db.Get(&user, query, email)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get user by email")
		return nil, err
	}
	logger.LogDebugCtx(c, "User retrieved by email", map[string]interface{}{"email": email})
	return &user, nil
}

func (r *authRepo) GetUserByID(c context.Context, userID int) (*models.User, error) {
	var user models.User
	query := "SELECT user_id, email, nama_user, asal_sekolah, role, password FROM users WHERE user_id = $1"
	err := r.db.Get(&user, query, userID)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get user by ID")
		return nil, err
	}
	logger.LogDebugCtx(c, "User retrieved by ID", map[string]interface{}{"user_id": userID})
	return &user, nil
}

func (r *authRepo) ResetPassword(c context.Context, newPassword, resetToken string) error {
	query := "UPDATE users SET password = $1, reset_token = NULL, reset_token_expired_at = NULL WHERE reset_token = $2 AND reset_token_expired_at > CURRENT_TIMESTAMP"
	result, err := r.db.Exec(query, newPassword, resetToken)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to reset password")
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to resolve reset password result")
		return err
	}
	if rowsAffected == 0 {
		logger.LogDebugCtx(c, "Reset password rejected because token is invalid or expired")
		return ErrInvalidOrExpiredResetToken
	}

	logger.LogDebugCtx(c, "Password reset")
	return nil
}

func (r *authRepo) RequestingPasswordReset(c context.Context, email, resetToken string, resetTokenExpiredAt time.Time) error {
	query := "UPDATE users SET reset_token = $1, reset_token_expired_at = $2 WHERE email = $3"
	_, err := r.db.Exec(query, resetToken, resetTokenExpiredAt, email)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to request password reset", map[string]interface{}{"email": email})
		return err
	}
	logger.LogDebugCtx(c, "Password reset requested", map[string]interface{}{"email": email})
	return nil
}
