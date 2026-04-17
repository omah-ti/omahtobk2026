package middleware

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
)

type AuthenticatedUser struct {
	Message     string `json:"message"`
	UserID      int    `json:"user_id"`
	Email       string `json:"email"`
	Username    string `json:"username"`
	AsalSekolah string `json:"asal_sekolah"`
	Role        string `json:"role"`
}

type refreshResult struct {
	user              *AuthenticatedUser
	setCookies        []string
	resolvedAccessTok string
	err               error
}

type refreshCall struct {
	done chan struct{}
	res  refreshResult
}

var refreshInFlight sync.Map

var reservedInboundHeaders = map[string]struct{}{
	"x-gateway":           {},
	"x-internal-request":  {},
	"x-auth-access-token": {},
	"x-user-id":           {},
	"x-user-email":        {},
	"x-user-username":     {},
	"x-user-asal-sekolah": {},
	"x-user-asal_sekolah": {},
	"x-user-role":         {},
}

func IsReservedInboundHeader(headerName string) bool {
	_, blocked := reservedInboundHeaders[strings.ToLower(strings.TrimSpace(headerName))]
	return blocked
}

func StripReservedHeaders() fiber.Handler {
	return func(c *fiber.Ctx) error {
		for key := range c.GetReqHeaders() {
			if IsReservedInboundHeader(key) {
				c.Request().Header.Del(key)
			}
		}

		return c.Next()
	}
}

func SessionAuthMiddleware(authServiceURL string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		accessToken := c.Cookies("access_token")
		refreshToken := c.Cookies("refresh_token")

		if accessToken == "" && refreshToken == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "Unauthorized",
				"message": "Authentication cookie required",
			})
		}

		user, setCookies, resolvedAccessToken, err := resolveSession(authServiceURL, accessToken, refreshToken)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   "Unauthorized",
				"message": err.Error(),
			})
		}

		for _, cookie := range setCookies {
			c.Context().Response.Header.Add("Set-Cookie", cookie)
		}

		if resolvedAccessToken != "" {
			c.Locals("access_token", resolvedAccessToken)
		}

		c.Locals("user_id", user.UserID)
		c.Locals("user_email", user.Email)
		c.Locals("user_username", user.Username)
		c.Locals("user_asal_sekolah", user.AsalSekolah)
		c.Locals("user_role", user.Role)

		return c.Next()
	}
}

func AddInternalHeaders(req *http.Request, c *fiber.Ctx) {
	req.Header.Set("X-Gateway", "omahto-api-gateway")
	req.Header.Set("X-Internal-Request", "true")

	if requestID := c.GetRespHeader("X-Request-ID"); requestID != "" {
		req.Header.Set("X-Request-ID", requestID)
	}
	if userID := c.Locals("user_id"); userID != nil {
		req.Header.Set("X-User-ID", fmt.Sprintf("%v", userID))
	}
	if userEmail := c.Locals("user_email"); userEmail != nil {
		req.Header.Set("X-User-Email", fmt.Sprintf("%v", userEmail))
	}
	if username := c.Locals("user_username"); username != nil {
		req.Header.Set("X-User-Username", fmt.Sprintf("%v", username))
	}
	if asalSekolah := c.Locals("user_asal_sekolah"); asalSekolah != nil {
		req.Header.Set("X-User-Asal-Sekolah", fmt.Sprintf("%v", asalSekolah))
	}
	if role := c.Locals("user_role"); role != nil {
		req.Header.Set("X-User-Role", fmt.Sprintf("%v", role))
	}
}

func resolveSession(authServiceURL, accessToken, refreshToken string) (*AuthenticatedUser, []string, string, error) {
	client := &http.Client{Timeout: 10 * time.Second}

	if accessToken != "" {
		user, err := validateAccessToken(client, authServiceURL, accessToken)
		if err == nil {
			return user, nil, accessToken, nil
		}
	}

	if refreshToken == "" {
		return nil, nil, "", fmt.Errorf("invalid or expired session")
	}

	return refreshSessionSingleFlight(client, authServiceURL, refreshToken)
}

func refreshSessionSingleFlight(client *http.Client, authServiceURL, refreshToken string) (*AuthenticatedUser, []string, string, error) {
	call := &refreshCall{done: make(chan struct{})}
	actual, loaded := refreshInFlight.LoadOrStore(refreshToken, call)
	if loaded {
		existing := actual.(*refreshCall)
		<-existing.done
		return existing.res.user, existing.res.setCookies, existing.res.resolvedAccessTok, existing.res.err
	}

	defer func() {
		close(call.done)
		refreshInFlight.Delete(refreshToken)
	}()

	user, setCookies, resolvedAccessToken, err := refreshSession(client, authServiceURL, refreshToken)
	call.res = refreshResult{
		user:              user,
		setCookies:        setCookies,
		resolvedAccessTok: resolvedAccessToken,
		err:               err,
	}

	return user, setCookies, resolvedAccessToken, err
}

func validateAccessToken(client *http.Client, authServiceURL, accessToken string) (*AuthenticatedUser, error) {
	req, err := http.NewRequest(http.MethodGet, authServiceURL+"/auth/validateprofile", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Cookie", fmt.Sprintf("access_token=%s", accessToken))
	req.Header.Set("X-Gateway", "omahto-api-gateway")
	req.Header.Set("X-Internal-Request", "true")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("invalid or expired session")
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var user AuthenticatedUser
	if err := json.Unmarshal(body, &user); err != nil {
		return nil, err
	}

	return &user, nil
}

func refreshSession(client *http.Client, authServiceURL, refreshToken string) (*AuthenticatedUser, []string, string, error) {
	req, err := http.NewRequest(http.MethodGet, authServiceURL+"/user/refresh", nil)
	if err != nil {
		return nil, nil, "", err
	}

	req.Header.Set("Cookie", fmt.Sprintf("refresh_token=%s", refreshToken))
	req.Header.Set("X-Gateway", "omahto-api-gateway")
	req.Header.Set("X-Internal-Request", "true")

	resp, err := client.Do(req)
	if err != nil {
		return nil, nil, "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, "", err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, nil, "", fmt.Errorf("failed to refresh session")
	}

	var user AuthenticatedUser
	if err := json.Unmarshal(body, &user); err != nil {
		return nil, nil, "", err
	}

	setCookies := resp.Header.Values("Set-Cookie")
	newAccessToken := extractCookieValueFromSetCookies(setCookies, "access_token")

	return &user, setCookies, newAccessToken, nil
}

func extractCookieValueFromSetCookies(setCookies []string, name string) string {
	prefix := name + "="
	for _, setCookie := range setCookies {
		firstPart := strings.SplitN(setCookie, ";", 2)[0]
		if strings.HasPrefix(firstPart, prefix) {
			return strings.TrimPrefix(firstPart, prefix)
		}
	}

	return ""
}
