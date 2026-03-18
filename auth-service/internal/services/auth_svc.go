package services

import (
	"auth-service/internal/logger"
	"auth-service/internal/models"
	"auth-service/internal/repositories"
	"auth-service/pkg/utils/emailer"
	"auth-service/pkg/utils/hash"
	"auth-service/pkg/utils/jwt"

	"context"
	"errors"
	"os"

	"golang.org/x/sync/errgroup"
)

type AuthService interface {
	RegisterUser(c context.Context, user *models.User) error
	LoginUser(c context.Context, email, password string) (string, string, error)
	RequestPasswordReset(c context.Context, email string) error
	ResetPassword(c context.Context, resetToken, newPassword string) error
}

var ErrInvalidOrExpiredResetToken = repositories.ErrInvalidOrExpiredResetToken

type authService struct {
	authRepo     repositories.AuthRepo
	tokenService RefreshTokenService
}

func NewAuthService(authRepo repositories.AuthRepo, tokenService RefreshTokenService) AuthService {
	return &authService{authRepo: authRepo, tokenService: tokenService}
}

func (s *authService) RegisterUser(c context.Context, userFromHandlers *models.User) error {
	// Force default role from server-side so clients cannot self-assign elevated privileges.
	userFromHandlers.Role = models.RoleUser

	// check if a user with that email exists, returns nil if no user is found and okay to proceed
	existingUser, _ := s.authRepo.GetUserByEmail(c, userFromHandlers.Email)

	if existingUser != nil {
		logger.LogErrorCtx(c, errors.New("user exists"), "User exists", map[string]interface{}{"email": userFromHandlers.Email})
		return errors.New("user with that email already exists")
	}

	// hash the password before storing it in the database
	hashedPassword, err := hash.HashPassword(userFromHandlers.Password)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to hash password", map[string]interface{}{"email": userFromHandlers.Email})
		return err
	}
	// set the user struct that is passed by the handlers password to the hashed password
	userFromHandlers.Password = hashedPassword

	// call the repo and create the user using the repo function, if the error is nil then log the error
	if err := s.authRepo.CreateUser(c, userFromHandlers); err != nil {
		logger.LogErrorCtx(c, err, "Failed to create user", map[string]interface{}{"email": userFromHandlers.Email})
		return err
	}

	return nil
}

func (s *authService) LoginUser(c context.Context, email, password string) (string, string, error) {
	// get the user that wants to login using the email that is passed from handler
	userThatWantsToLogin, err := s.authRepo.GetUserByEmail(c, email)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to login", map[string]interface{}{"email": email})
		return "", "", errors.New("invalid email or password")
	}

	// check the password that the user entered with the password in the database (check hash)
	if !hash.CheckPasswordHash(password, userThatWantsToLogin.Password) {
		logger.LogErrorCtx(c, err, "Failed to login", map[string]interface{}{"email": email})
		return "", "", errors.New("invalid email or password")
	}

	// if all is okay then generate the token pair and return it to the handler to be sent to the client
	accessToken, refreshToken, err := s.tokenService.GenerateAccessRefreshTokenPair(c, userThatWantsToLogin.UserID)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to generate token pair", map[string]interface{}{"email": email})
		return "", "", errors.New("failed to generate token pair")
	}

	return accessToken, refreshToken, nil
}

func (s *authService) RequestPasswordReset(c context.Context, email string) error {
	// create a new errgroup to run multiple goroutines concurrently
	var g errgroup.Group
	user, err := s.authRepo.GetUserByEmail(c, email)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get user by email", map[string]interface{}{"email": email})
		return errors.New("failed to get user by email")
	}
	if user == nil {
		logger.LogErrorCtx(c, errors.New("user not found"), "User not found", map[string]interface{}{"email": email})
		return errors.New("user not found")
	}
	// create the reset token and expirtion time using the utils
	resetToken, resetTokenExpiredAt, err := jwt.CreateResetToken()
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to generate reset tokens", map[string]interface{}{"email": email})
		return errors.New("failed to generate reset tokens")
	}
	// generate resetLink using resetToken
	var resetLink string
	if os.Getenv("ENVIRONMENT") == "production" {
		resetLink = "https://tryout.omahti.web.id/forgot-password/" + resetToken
	} else {
		resetLink = "http://localhost:3000/forgot-password/" + resetToken
	}

	// run the goroutines concurrently
	// blacklist the token that is associated with the email, so that when user is requesting password reset, the token is blacklisted
	g.Go(func() error {
		if err := s.tokenService.BlacklistTokenOnEmail(c, email); err != nil {
			logger.LogErrorCtx(c, err, "Failed to blacklist token on email", map[string]interface{}{"email": email})
			return errors.New("failed to blacklist token on email")
		}
		return nil
	})

	// call the repo and store the reset token in the database
	g.Go(func() error {
		if err := s.authRepo.RequestingPasswordReset(c, email, resetToken, resetTokenExpiredAt); err != nil {
			logger.LogErrorCtx(c, err, "Failed to request password reset", map[string]interface{}{"email": email})
			return errors.New("failed to request password reset")
		}
		return nil
	})

	// email the user the reset link, using the email utils
	g.Go(func() error {
		if err := emailer.SendPasswordResetEmail(email, resetLink); err != nil {
			logger.LogErrorCtx(c, err, "Failed to send password reset email", map[string]interface{}{"email": email, "reset_link": resetLink})
			return errors.New("failed to send password reset email")
		}
		return nil
	})
	// wait for the goroutines to finish, if there is an error return the error, if not return nil
	if err := g.Wait(); err != nil {
		return err
	}

	return nil
}

func (s *authService) ResetPassword(c context.Context, resetToken, newPassword string) error {
	newHashedPassword, err := hash.HashPassword(newPassword)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to hash password")
		return errors.New("failed to hash password")
	}

	// call the repo and reset the password using the reset token and the new password
	err = s.authRepo.ResetPassword(c, newHashedPassword, resetToken)
	if err != nil {
		if errors.Is(err, repositories.ErrInvalidOrExpiredResetToken) {
			logger.LogDebugCtx(c, "Reset password rejected because token is invalid or expired")
			return ErrInvalidOrExpiredResetToken
		}

		logger.LogErrorCtx(c, err, "Failed to reset password")
		return errors.New("failed to reset password")
	}

	return nil
}
