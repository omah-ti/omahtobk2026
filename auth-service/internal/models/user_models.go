package models

import "time"

const (
	RoleAdmin = "admin"
	RoleUser  = "user"
)

type User struct {
	UserID              int       `db:"user_id" json:"user_id"`
	Email               string    `db:"email" json:"email" binding:"required,email"`
	NamaUser            string    `db:"nama_user" json:"nama_user" binding:"required,max=100"`
	AsalSekolah         string    `db:"asal_sekolah" json:"asal_sekolah" binding:"required"`
	Role                string    `db:"role" json:"role"`
	Password            string    `db:"password" json:"password" binding:"required,min=8"`
	ResetToken          string    `db:"reset_token" json:"reset_token"`
	ResetTokenExpiredAt time.Time `db:"reset_token_expired_at" json:"reset_token_expired_at"`
}
