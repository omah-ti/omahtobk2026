package config

import (
	"os"
	"strings"
)

type Config struct {
	Port                 string
	CORSURL              string
	AuthServiceURL       string
	SoalServiceURL       string
	TryoutServiceURL     string
	MinatBakatServiceURL string
	TrustedProxies       []string
}

func LoadConfig() Config {
	return Config{
		Port:                 getEnv("PORT", "8080"),
		CORSURL:              getEnv("CORS_URL", "*"),
		AuthServiceURL:       getEnv("AUTH_SERVICE_URL", "http://auth-service-api:8081"),
		SoalServiceURL:       getEnv("SOAL_SERVICE_URL", "http://soal-service-api:8082"),
		TryoutServiceURL:     getEnv("TRYOUT_SERVICE_URL", "http://tryout-service-api:8083"),
		MinatBakatServiceURL: getEnv("MINAT_BAKAT_SERVICE_URL", "http://minat-bakat-service-api:8084"),
		TrustedProxies:       getCSVEnv("TRUSTED_PROXIES"),
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}

	return fallback
}

func getCSVEnv(key string) []string {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return nil
	}

	parts := strings.Split(raw, ",")
	values := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			values = append(values, trimmed)
		}
	}

	if len(values) == 0 {
		return nil
	}

	return values
}
