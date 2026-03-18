package controller

import (
	"bytes"
	"io"
	"net/http"
	"time"

	"github.com/gofiber/fiber/v2"
)

type AuthController struct {
	authServiceURL string
	client         *http.Client
}

func NewAuthController(authServiceURL string) *AuthController {
	return &AuthController{
		authServiceURL: authServiceURL,
		client:         &http.Client{Timeout: 15 * time.Second},
	}
}

func (a *AuthController) Login(c *fiber.Ctx) error {
	return a.proxy(c, http.MethodPost, "/user/login")
}

func (a *AuthController) Register(c *fiber.Ctx) error {
	return a.proxy(c, http.MethodPost, "/user/register")
}

func (a *AuthController) Refresh(c *fiber.Ctx) error {
	return a.proxy(c, http.MethodGet, "/user/refresh")
}

func (a *AuthController) Logout(c *fiber.Ctx) error {
	return a.proxy(c, http.MethodPost, "/auth/logout")
}

func (a *AuthController) RequestPasswordReset(c *fiber.Ctx) error {
	return a.proxy(c, http.MethodPost, "/user/request-password-reset")
}

func (a *AuthController) ResetPassword(c *fiber.Ctx) error {
	return a.proxy(c, http.MethodPost, "/user/reset-password")
}

func (a *AuthController) Me(c *fiber.Ctx) error {
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message":      "Authorized and okay to proceed",
		"user_id":      c.Locals("user_id"),
		"email":        c.Locals("user_email"),
		"username":     c.Locals("user_username"),
		"asal_sekolah": c.Locals("user_asal_sekolah"),
		"role":         c.Locals("user_role"),
	})
}

func (a *AuthController) proxy(c *fiber.Ctx, method, upstreamPath string) error {
	req, err := http.NewRequest(method, a.authServiceURL+upstreamPath, bytes.NewReader(c.Body()))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Internal Server Error",
			"message": "Failed to create upstream request",
		})
	}

	for key, values := range c.GetReqHeaders() {
		for _, value := range values {
			req.Header.Add(key, value)
		}
	}

	req.Header.Set("X-Gateway", "omahto-api-gateway")
	req.Header.Set("X-Internal-Request", "true")

	resp, err := a.client.Do(req)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error":   "Bad Gateway",
			"message": "Auth service unavailable",
		})
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   "Internal Server Error",
			"message": "Failed to read upstream response",
		})
	}

	for key, values := range resp.Header {
		if key == "Set-Cookie" {
			for _, value := range values {
				c.Context().Response.Header.Add("Set-Cookie", value)
			}
			continue
		}

		for _, value := range values {
			c.Append(key, value)
		}
	}

	return c.Status(resp.StatusCode).Send(respBody)
}
