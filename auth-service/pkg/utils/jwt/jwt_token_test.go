package jwt

import "testing"

func TestCreateAndValidateAccessToken(t *testing.T) {
	t.Setenv("JWT_ACCESS_SECRET", "test-secret")

	token, err := CreateAccessToken(42, "tester", "school", "tester@example.com")
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
}

func TestValidateAccessTokenWithoutSecret(t *testing.T) {
	t.Setenv("JWT_ACCESS_SECRET", "")

	if _, err := ValidateAccessToken("invalid-token"); err == nil {
		t.Fatal("expected error when JWT_ACCESS_SECRET is not set")
	}
}
