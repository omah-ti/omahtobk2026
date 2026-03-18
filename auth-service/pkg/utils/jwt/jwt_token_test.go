package jwt

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

func TestCreateAndValidateAccessToken(t *testing.T) {
	t.Setenv("JWT_ACCESS_SECRET", "test-secret")
	t.Setenv("JWT_ISSUER", "omahto-auth")
	t.Setenv("JWT_AUDIENCE", "omahto-api")

	token, err := CreateAccessToken(42, "tester", "school", "tester@example.com", "user")
	if err != nil {
		t.Fatalf("CreateAccessToken returned error: %v", err)
	}

	claims, err := ValidateAccessToken(token)
	if err != nil {
		t.Fatalf("ValidateAccessToken returned error: %v", err)
	}

	if claims.UserID != 42 {
		t.Fatalf("expected user_id 42, got %d", claims.UserID)
	}
	if claims.Email != "tester@example.com" {
		t.Fatalf("expected email tester@example.com, got %s", claims.Email)
	}
	if claims.NamaUser != "tester" {
		t.Fatalf("expected nama_user tester, got %s", claims.NamaUser)
	}
	if claims.AsalSekolah != "school" {
		t.Fatalf("expected asal_sekolah school, got %s", claims.AsalSekolah)
	}
	if claims.Role != "user" {
		t.Fatalf("expected role user, got %s", claims.Role)
	}
	if claims.Issuer != "omahto-auth" {
		t.Fatalf("expected issuer omahto-auth, got %s", claims.Issuer)
	}
	if !claims.VerifyAudience("omahto-api", true) {
		t.Fatal("expected audience omahto-api")
	}
}

func TestValidateAccessTokenWithoutSecret(t *testing.T) {
	t.Setenv("JWT_ACCESS_SECRET", "")
	t.Setenv("JWT_ISSUER", "omahto-auth")

	if _, err := ValidateAccessToken("invalid-token"); err == nil {
		t.Fatal("expected error when JWT_ACCESS_SECRET is not set")
	}
}

func TestCreateAccessTokenWithoutIssuer(t *testing.T) {
	t.Setenv("JWT_ACCESS_SECRET", "test-secret")
	t.Setenv("JWT_ISSUER", "")

	if _, err := CreateAccessToken(1, "tester", "school", "tester@example.com", "user"); err == nil {
		t.Fatal("expected error when JWT_ISSUER is not set")
	}
}

func TestValidateAccessTokenRejectsInvalidIssuer(t *testing.T) {
	t.Setenv("JWT_ACCESS_SECRET", "test-secret")
	t.Setenv("JWT_ISSUER", "expected-issuer")

	claims := AccessTokenClaims{
		UserID:      7,
		Email:       "tester@example.com",
		NamaUser:    "tester",
		AsalSekolah: "school",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(10 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "other-issuer",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString([]byte("test-secret"))
	if err != nil {
		t.Fatalf("failed to sign token: %v", err)
	}

	if _, err := ValidateAccessToken(tokenStr); err == nil {
		t.Fatal("expected error for invalid issuer")
	}
}

func TestValidateAccessTokenRejectsInvalidAudience(t *testing.T) {
	t.Setenv("JWT_ACCESS_SECRET", "test-secret")
	t.Setenv("JWT_ISSUER", "omahto-auth")
	t.Setenv("JWT_AUDIENCE", "expected-aud")

	claims := AccessTokenClaims{
		UserID:      7,
		Email:       "tester@example.com",
		NamaUser:    "tester",
		AsalSekolah: "school",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(10 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "omahto-auth",
			Audience:  jwt.ClaimStrings{"other-aud"},
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString([]byte("test-secret"))
	if err != nil {
		t.Fatalf("failed to sign token: %v", err)
	}

	if _, err := ValidateAccessToken(tokenStr); err == nil {
		t.Fatal("expected error for invalid audience")
	}
}
