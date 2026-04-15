package emailer

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
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

func SendPasswordResetEmail(to, resetLink string) error {
	apiToken := strings.TrimSpace(os.Getenv("MAILTRAP_API_TOKEN"))
	if apiToken == "" {
		return errors.New("MAILTRAP_API_TOKEN is missing")
	}

	apiURL := strings.TrimSpace(os.Getenv("MAILTRAP_API_URL"))
	if apiURL == "" {
		apiURL = defaultMailtrapAPIURL
	}

	senderEmail := strings.TrimSpace(os.Getenv("MAILTRAP_SENDER_EMAIL"))
	if senderEmail == "" {
		return errors.New("MAILTRAP_SENDER_EMAIL is missing")
	}

	senderName := strings.TrimSpace(os.Getenv("MAILTRAP_SENDER_NAME"))
	if senderName == "" {
		senderName = defaultMailtrapSenderName
	}

	category := strings.TrimSpace(os.Getenv("MAILTRAP_CATEGORY"))
	if category == "" {
		category = defaultMailtrapCategory
	}

	if strings.TrimSpace(to) == "" {
		return errors.New("recipient email is required")
	}
	if strings.TrimSpace(resetLink) == "" {
		return errors.New("reset link is required")
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
		From: mailtrapAddress{Email: senderEmail, Name: senderName},
		To: []mailtrapAddress{
			{Email: to},
		},
		Subject:  "Password Reset Request - OmahTryOut",
		Text:     fmt.Sprintf("Click this link to reset your password: %s", resetLink),
		HTML:     htmlBody,
		Category: category,
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return errors.New("failed to marshal email payload")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return errors.New("failed to create mail request")
	}
	req.Header.Set("Authorization", "Bearer "+apiToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
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
