package repositories_test

import (
	"fmt"
	"testing"
	"time"

	"auth-service/internal/models"
	"auth-service/internal/repositories"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	"github.com/stretchr/testify/require"
)

func setupMock(t *testing.T) (repositories.AuthRepo, sqlmock.Sqlmock, *gin.Context) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	sqlxDB := sqlx.NewDb(db, "sqlmock")
	c, _ := gin.CreateTestContext(nil)
	return repositories.NewAuthRepo(sqlxDB), mock, c
}

func TestCreateUser_Success(t *testing.T) {
	repo, mock, c := setupMock(t)
	user := &models.User{Email: "a@b.com", NamaUser: "Test", Password: "pwd", AsalSekolah: "School", Role: models.RoleUser}
	rows := sqlmock.NewRows([]string{"user_id"}).AddRow(42)
	mock.ExpectQuery(`INSERT INTO users`).
		WithArgs(user.Email, user.NamaUser, user.Password, user.AsalSekolah, user.Role).
		WillReturnRows(rows)

	err := repo.CreateUser(c, user)
	require.NoError(t, err)
	require.Equal(t, 42, user.UserID)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestCreateUser_Error(t *testing.T) {
	repo, mock, c := setupMock(t)
	user := &models.User{}
	mock.ExpectQuery(`INSERT INTO users`).WillReturnError(fmt.Errorf("fail"))

	err := repo.CreateUser(c, user)
	require.Error(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestCreateUser_MissingField(t *testing.T) {
	repo, mock, c := setupMock(t)
	user := &models.User{Email: "oke@gmail.com", NamaUser: "Test", Password: "pwd", AsalSekolah: "School", Role: models.RoleUser}
	mock.ExpectQuery(`INSERT INTO users`).
		WithArgs(user.Email, user.NamaUser, user.Password, user.AsalSekolah, user.Role).
		WillReturnError(fmt.Errorf("missing email"))
	err := repo.CreateUser(c, user)
	require.Error(t, err)
	require.Equal(t, "missing email", err.Error())
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetUserByEmail_Success(t *testing.T) {
	repo, mock, c := setupMock(t)
	expected := models.User{UserID: 7, Email: "x@y.com", NamaUser: "X", AsalSekolah: "Z", Role: models.RoleUser, Password: "p"}
	rows := sqlmock.NewRows([]string{"user_id", "email", "nama_user", "asal_sekolah", "role", "password"}).
		AddRow(expected.UserID, expected.Email, expected.NamaUser, expected.AsalSekolah, expected.Role, expected.Password)
	mock.ExpectQuery(`SELECT user_id, email`).
		WithArgs(expected.Email).
		WillReturnRows(rows)

	u, err := repo.GetUserByEmail(c, expected.Email)
	require.NoError(t, err)
	require.Equal(t, &expected, u)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetUserByEmail_Error(t *testing.T) {
	repo, mock, c := setupMock(t)
	mock.ExpectQuery(`SELECT user_id, email`).WillReturnError(fmt.Errorf("nope"))

	_, err := repo.GetUserByEmail(c, "e@e.com")
	require.Error(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetUserByID_Success(t *testing.T) {
	repo, mock, c := setupMock(t)
	expected := models.User{UserID: 5, Email: "e@f.com", NamaUser: "E", AsalSekolah: "Y", Role: models.RoleAdmin, Password: "pwd"}
	rows := sqlmock.NewRows([]string{"user_id", "email", "nama_user", "asal_sekolah", "role", "password"}).
		AddRow(expected.UserID, expected.Email, expected.NamaUser, expected.AsalSekolah, expected.Role, expected.Password)
	mock.ExpectQuery(`SELECT user_id, email`).
		WithArgs(expected.UserID).
		WillReturnRows(rows)

	u, err := repo.GetUserByID(c, expected.UserID)
	require.NoError(t, err)
	require.Equal(t, &expected, u)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestGetUserByID_Error(t *testing.T) {
	repo, mock, c := setupMock(t)
	mock.ExpectQuery(`SELECT user_id, email`).WillReturnError(fmt.Errorf("oops"))

	_, err := repo.GetUserByID(c, 1)
	require.Error(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestResetPassword_Success(t *testing.T) {
	repo, mock, c := setupMock(t)
	token := "tok"
	newPass := "new"
	mock.ExpectExec(`UPDATE users SET password`).
		WithArgs(newPass, token).
		WillReturnResult(sqlmock.NewResult(0, 1))

	err := repo.ResetPassword(c, newPass, token)
	require.NoError(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestResetPassword_Error(t *testing.T) {
	repo, mock, c := setupMock(t)
	mock.ExpectExec(`UPDATE users SET password`).WillReturnError(fmt.Errorf("err"))

	err := repo.ResetPassword(c, "p", "t")
	require.Error(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestResetPassword_InvalidOrExpiredToken(t *testing.T) {
	repo, mock, c := setupMock(t)
	mock.ExpectExec(`UPDATE users SET password`).
		WithArgs("p", "t").
		WillReturnResult(sqlmock.NewResult(0, 0))

	err := repo.ResetPassword(c, "p", "t")
	require.ErrorIs(t, err, repositories.ErrInvalidOrExpiredResetToken)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestRequestingPasswordReset_Success(t *testing.T) {
	repo, mock, c := setupMock(t)
	email, token := "a@b", "tkn"
	exp := time.Now().Add(time.Hour)
	mock.ExpectExec(`UPDATE users SET reset_token`).
		WithArgs(token, exp, email).
		WillReturnResult(sqlmock.NewResult(0, 1))

	err := repo.RequestingPasswordReset(c, email, token, exp)
	require.NoError(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestRequestingPasswordReset_Error(t *testing.T) {
	repo, mock, c := setupMock(t)
	mock.ExpectExec(`UPDATE users SET reset_token`).WillReturnError(fmt.Errorf("fail"))

	err := repo.RequestingPasswordReset(c, "e", "t", time.Now())
	require.Error(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}
