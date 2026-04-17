package main

import (
	"bytes"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	appconfig "api-gateway/config"
	"api-gateway/controller"
	"api-gateway/middleware"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(".env"); err != nil {
		_ = godotenv.Load("env.example")
	}

	config := appconfig.LoadConfig()
	redisConfig := appconfig.LoadRedisConfig()
	var authRateLimiter fiber.Handler
	var refreshRateLimiter fiber.Handler

	app := fiber.New(fiber.Config{
		AppName:                 "OmahTO API Gateway",
		ServerHeader:            "OmahTO-API-Gateway",
		EnableTrustedProxyCheck: true,
		TrustedProxies:          config.TrustedProxies,
		ProxyHeader:             fiber.HeaderXForwardedFor,
		EnableIPValidation:      true,
	})

	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(middleware.StripReservedHeaders())
	app.Use(requestIDMiddleware())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     config.CORSURL,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization, X-Request-ID",
		AllowMethods:     "GET, POST, PUT, PATCH, DELETE, OPTIONS",
		AllowCredentials: true,
	}))

	if redisConfig.Host != "" {
		redisClient := appconfig.NewRedisClient(redisConfig)
		globalRateConfig := middleware.RedisRateLimiterConfig{
			Max:         200,
			Expiration:  time.Minute,
			RedisClient: redisClient,
		}
		authRateConfig := middleware.RedisRateLimiterConfig{
			Max:         10,
			Expiration:  time.Minute,
			RedisClient: redisClient,
		}
		refreshRateConfig := middleware.RedisRateLimiterConfig{
			Max:         100,
			Expiration:  time.Minute,
			RedisClient: redisClient,
		}

		app.Use(middleware.RedisGlobalRateLimiter(globalRateConfig))
		authRateLimiter = middleware.RedisAuthRateLimiter(authRateConfig)
		refreshRateLimiter = middleware.RedisRefreshRateLimiter(refreshRateConfig)
	}

	authController := controller.NewAuthController(config.AuthServiceURL)

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "OK",
			"message": "OmahTO API Gateway is running",
		})
	})

	authGroup := app.Group("/api/auth")

	if authRateLimiter != nil {
		authGroup.Post("/login", authRateLimiter, authController.Login)
		authGroup.Post("/register", authRateLimiter, authController.Register)
		authGroup.Post("/request-password-reset", authRateLimiter, authController.RequestPasswordReset)
		authGroup.Post("/reset-password", authRateLimiter, authController.ResetPassword)
		authGroup.Post("/logout", authRateLimiter, authController.Logout)
	} else {
		authGroup.Post("/login", authController.Login)
		authGroup.Post("/register", authController.Register)
		authGroup.Post("/request-password-reset", authController.RequestPasswordReset)
		authGroup.Post("/reset-password", authController.ResetPassword)
		authGroup.Post("/logout", authController.Logout)
	}

	if refreshRateLimiter != nil {
		authGroup.Get("/refresh", refreshRateLimiter, authController.Refresh)
	} else {
		authGroup.Get("/refresh", authController.Refresh)
	}

	protected := app.Group("/api", middleware.SessionAuthMiddleware(config.AuthServiceURL))
	protected.Get("/me", authController.Me)
	protected.All("/soal/answer-key", blockSensitiveSoalRoute())
	protected.All("/soal/answer-key/*", blockSensitiveSoalRoute())
	protected.All("/soal", proxyRequest(config.SoalServiceURL, "/api"))
	protected.All("/soal/*", proxyRequest(config.SoalServiceURL, "/api"))
	protected.All("/tryout", proxyRequest(config.TryoutServiceURL, "/api"))
	protected.All("/tryout/*", proxyRequest(config.TryoutServiceURL, "/api"))
	protected.All("/minat-bakat", proxyRequest(config.MinatBakatServiceURL, "/api"))
	protected.All("/minat-bakat/*", proxyRequest(config.MinatBakatServiceURL, "/api"))

	app.Use(func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error":   "Not Found",
			"message": "Service not found",
			"path":    c.Path(),
		})
	})

	log.Printf("API Gateway starting on port %s", config.Port)
	log.Fatal(app.Listen(":" + config.Port))
}

func requestIDMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		requestID := c.Get("X-Request-ID")
		if requestID == "" {
			requestID = uuid.NewString()
		}

		c.Set("X-Request-ID", requestID)
		return c.Next()
	}
}

func blockSensitiveSoalRoute() fiber.Handler {
	return func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error":   "Not Found",
			"message": "Resource not found",
		})
	}
}

func proxyRequest(targetURL, stripPrefix string) fiber.Handler {
	client := &http.Client{Timeout: 20 * time.Second}

	return func(c *fiber.Ctx) error {
		upstreamPath := strings.TrimPrefix(c.Path(), stripPrefix)
		if upstreamPath == "" {
			upstreamPath = "/"
		}

		fullURL := strings.TrimRight(targetURL, "/") + upstreamPath
		queryParams := c.Context().QueryArgs().String()
		if queryParams != "" {
			fullURL += "?" + queryParams
		}

		req, err := http.NewRequest(c.Method(), fullURL, bytes.NewReader(c.Body()))
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error":   "Internal Server Error",
				"message": "Failed to create upstream request",
			})
		}

		for key, values := range c.GetReqHeaders() {
			if middleware.IsReservedInboundHeader(key) {
				continue
			}

			for _, value := range values {
				req.Header.Add(key, value)
			}
		}

		if refreshedAccessToken, ok := c.Locals("access_token").(string); ok && refreshedAccessToken != "" {
			req.Header.Set("Cookie", upsertCookie(req.Header.Get("Cookie"), "access_token", refreshedAccessToken))
		}

		middleware.AddInternalHeaders(req, c)

		resp, err := client.Do(req)
		if err != nil {
			return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
				"error":   "Bad Gateway",
				"message": "Upstream service unavailable",
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
}

func upsertCookie(rawCookieHeader, cookieName, cookieValue string) string {
	parts := strings.Split(rawCookieHeader, ";")
	prefix := cookieName + "="
	found := false
	filtered := make([]string, 0, len(parts)+1)

	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			continue
		}

		if strings.HasPrefix(trimmed, prefix) {
			filtered = append(filtered, prefix+cookieValue)
			found = true
			continue
		}

		filtered = append(filtered, trimmed)
	}

	if !found {
		filtered = append(filtered, prefix+cookieValue)
	}

	return strings.Join(filtered, "; ")
}
