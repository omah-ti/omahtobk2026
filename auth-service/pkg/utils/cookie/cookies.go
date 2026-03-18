package cookie

import (
	"os"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// later we have to have a way to set the tryout cookie so that when user is accessing the try out, the cookie doesnt expire that fast
var cookieDomain = os.Getenv("COOKIE_DOMAIN")
var cookieSecure = getCookieSecure()

func envInt(name string, fallback int) int {
	raw := strings.TrimSpace(os.Getenv(name))
	if raw == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(raw)
	if err != nil || parsed <= 0 {
		return fallback
	}

	return parsed
}

func accessCookieMaxAgeSeconds() int {
	// Keep cookie lifetime aligned with JWT access token TTL.
	minutes := envInt("ACCESS_TOKEN_TTL_MINUTES", 60)
	return minutes * 60
}

func refreshCookieMaxAgeSeconds() int {
	// default 7 days
	days := envInt("REFRESH_TOKEN_TTL_DAYS", 7)
	return days * 24 * 60 * 60
}

func getCookieSecure() bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv("COOKIE_SECURE")))
	if value == "" {
		return true
	}

	return value == "1" || value == "true" || value == "yes"
}

func SetCookie(c *gin.Context, name, value string, maxAge int, path, domain string, secure, httpOnly bool) {
	c.SetCookie(
		name,
		value,
		maxAge,
		path,
		domain,
		secure,
		httpOnly)
}

func SetAccessAndRefresh(c *gin.Context, accessToken, refreshToken string) error {
	SetCookie(c, "access_token", accessToken, accessCookieMaxAgeSeconds(), "/", cookieDomain, cookieSecure, true)
	SetCookie(c, "refresh_token", refreshToken, refreshCookieMaxAgeSeconds(), "/", cookieDomain, cookieSecure, true)
	return nil
}

func GetCookie(c *gin.Context, name string) (string, error) {
	cookie, err := c.Cookie(name)
	if err != nil {
		return "", err
	}
	return cookie, nil
}

func ClearCookie(c *gin.Context, name string) {
	SetCookie(c, name, "", -1, "/", cookieDomain, cookieSecure, true)
}
