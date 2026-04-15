package emailer

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/mail"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

const (
	defaultMailtrapAPIURL     = "https://send.api.mailtrap.io/api/send"
	defaultMailtrapSenderName = "OmahTryOut"
	defaultMailtrapCategory   = "Password Reset"
)

type mailtrapAddress struct {
	Email string `json:"email"`
	Name  string `json:"name,omitempty"`
}

type mailtrapPayload struct {
	From     mailtrapAddress   `json:"from"`
	To       []mailtrapAddress `json:"to"`
	Subject  string            `json:"subject"`
	Text     string            `json:"text"`
	HTML     string            `json:"html"`
	Category string            `json:"category,omitempty"`
}

type mailtrapConfig struct {
	apiToken    string
	apiURL      string
	senderEmail string
	senderName  string
	category    string
}

var mailtrapHTTPClient = &http.Client{
	Timeout: 10 * time.Second,
	CheckRedirect: func(req *http.Request, via []*http.Request) error {
		// Do not forward auth headers across redirects.
		return http.ErrUseLastResponse
	},
}

func loadMailtrapConfig() (mailtrapConfig, error) {
	apiToken := strings.TrimSpace(os.Getenv("MAILTRAP_API_TOKEN"))
	if apiToken == "" {
		return mailtrapConfig{}, errors.New("MAILTRAP_API_TOKEN is missing")
	}

	apiURL := strings.TrimSpace(os.Getenv("MAILTRAP_API_URL"))
	if apiURL == "" {
		apiURL = defaultMailtrapAPIURL
	}

	parsedURL, err := url.ParseRequestURI(apiURL)
	if err != nil {
		return mailtrapConfig{}, errors.New("MAILTRAP_API_URL is invalid")
	}
	if parsedURL.Scheme != "https" {
		return mailtrapConfig{}, errors.New("MAILTRAP_API_URL must use https")
	}

	senderEmail := strings.TrimSpace(os.Getenv("MAILTRAP_SENDER_EMAIL"))
	if senderEmail == "" {
		return mailtrapConfig{}, errors.New("MAILTRAP_SENDER_EMAIL is missing")
	}
	if _, err := mail.ParseAddress(senderEmail); err != nil {
		return mailtrapConfig{}, errors.New("MAILTRAP_SENDER_EMAIL is invalid")
	}

	senderName := strings.TrimSpace(os.Getenv("MAILTRAP_SENDER_NAME"))
	if senderName == "" {
		senderName = defaultMailtrapSenderName
	}

	category := strings.TrimSpace(os.Getenv("MAILTRAP_CATEGORY"))
	if category == "" {
		category = defaultMailtrapCategory
	}

	return mailtrapConfig{
		apiToken:    apiToken,
		apiURL:      apiURL,
		senderEmail: senderEmail,
		senderName:  senderName,
		category:    category,
	}, nil
}

func validateRecipientAndResetLink(to, resetLink string) error {
	to = strings.TrimSpace(to)
	if to == "" {
		return errors.New("recipient email is required")
	}
	if _, err := mail.ParseAddress(to); err != nil {
		return errors.New("recipient email is invalid")
	}

	resetLink = strings.TrimSpace(resetLink)
	if resetLink == "" {
		return errors.New("reset link is required")
	}

	parsedResetLink, err := url.ParseRequestURI(resetLink)
	if err != nil {
		return errors.New("reset link is invalid")
	}
	if parsedResetLink.Scheme != "http" && parsedResetLink.Scheme != "https" {
		return errors.New("reset link must use http or https")
	}

	return nil
}

func SendPasswordResetEmail(to, resetLink string) error {
	cfg, err := loadMailtrapConfig()
	if err != nil {
		return err
	}

	if err := validateRecipientAndResetLink(to, resetLink); err != nil {
		return err
	}

	htmlBody := fmt.Sprintf(`
		<!DOCTYPE html>
		<html>
		<head>
			<title>Password Reset</title>
			<style>
				.container {
					width: 100%%;
					max-width: 500px;
					margin: 0 auto;
					padding: 20px;
					border-radius: 10px;
					box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
					font-family: Arial, sans-serif;
					background-color: #ffffff;
				}
				.button {
					display: inline-block;
					padding: 12px 20px;
					margin: 20px 0;
					font-size: 16px;
					color: #fff;
					background-color: #007BFF;
					text-decoration: none;
					border-radius: 5px;
				}
				.footer {
					margin-top: 20px;
					font-size: 12px;
					color: #666;
				}
			</style>
		</head>
		<body>
			<div class="container">
				<h2>Password Reset Request</h2>
				<p>We received a request to reset your password. Click the button below to set a new password:</p>
				<p><a class="button" href="%s">Reset Password</a></p>
				<p>If you didn’t request this, please ignore this email or contact us on Instagram @omahti_ugm.</p>
				<div class="footer">
					<p>Best regards,<br>OmahTI</p>
				</div>
			</div>
		</body>
		</html>`, resetLink)

	payload := mailtrapPayload{
		From: mailtrapAddress{Email: cfg.senderEmail, Name: cfg.senderName},
		To: []mailtrapAddress{
			{Email: to},
		},
		Subject:  "Password Reset Request - OmahTryOut",
		Text:     fmt.Sprintf("Click this link to reset your password: %s", resetLink),
		HTML:     htmlBody,
		Category: cfg.category,
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return errors.New("failed to marshal email payload")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, cfg.apiURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return errors.New("failed to create mail request")
	}
	req.Header.Set("Authorization", "Bearer "+cfg.apiToken)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")

	resp, err := mailtrapHTTPClient.Do(req)
	if err != nil {
		if ctx.Err() != nil {
			return errors.New("timeout reached while sending email")
		}
		return errors.New("failed to send email")
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		responseBody, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return fmt.Errorf("mailtrap request failed: status=%d body=%s", resp.StatusCode, strings.TrimSpace(string(responseBody)))
	}

	return nil
}
