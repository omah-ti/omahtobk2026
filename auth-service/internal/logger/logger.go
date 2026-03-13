package logger

import (
	"os"
	"path/filepath"
	"runtime"

	"context"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
)

var (
	Log      zerolog.Logger
	ErrorLog zerolog.Logger
)

const loggerKey = "request_logger"
const requestIDKey = "request_id"

func InitLogger() {
	// Set log level based on environment
	if os.Getenv("ENVIRONMENT") == "production" {
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	} else {
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	}

	// Create a sampler for log entries
	// This configuration:
	// - Keeps the first N logs (initial burst)
	// - After that, samples logs at the given interval (1 out of every M)
	// sampler := &zerolog.BurstSampler{
	// 	Burst:       5,                             // Allow first 5 messages without sampling
	// 	Period:      300 * time.Second,             // Reset counter every 30 seconds
	// 	NextSampler: &zerolog.BasicSampler{N: 100}, // After burst, sample 1 in 50 messages
	// }

	// Check if running in Cloud Run (no need for file logging)
	// Cloud Run detected → Log only to stdout/stderr with sampling
	Log = zerolog.New(os.Stdout).With().
		Timestamp().
		Str("service", "auth-service").
		Logger()

	// Don't sample error logs to ensure all errors are captured
	ErrorLog = zerolog.New(os.Stderr).With().
		Timestamp().
		Str("service", "auth-service").
		Logger()
}

// AttachLogger stores a request-scoped logger in context (e.g., gin.Context)
func AttachLogger(c *gin.Context, l zerolog.Logger) {
	c.Set(loggerKey, l)
}

// FromContext retrieves a logger from context, falling back to global Log
func FromContext(ctx context.Context) *zerolog.Logger {
	if ginCtx, ok := ctx.(*gin.Context); ok {
		if val, exists := ginCtx.Get(loggerKey); exists {
			if logger, ok := val.(zerolog.Logger); ok {
				return &logger
			}
		}
	}
	return &Log
}

func requestIDFromContext(ctx context.Context) string {
	if ginCtx, ok := ctx.(*gin.Context); ok {
		if requestID := ginCtx.GetString(requestIDKey); requestID != "" {
			return requestID
		}
	}

	if requestID, ok := ctx.Value(requestIDKey).(string); ok && requestID != "" {
		return requestID
	}

	return "unknown"
}

// LogDebugCtx logs debug messages with context and optional fields
func LogDebugCtx(ctx context.Context, message string, fields ...map[string]interface{}) {
	pc, file, line, _ := runtime.Caller(1)
	funcName := runtime.FuncForPC(pc).Name()

	log := FromContext(ctx).Debug().
		Str("request_id", requestIDFromContext(ctx)).
		Str("function", funcName).
		Str("file", filepath.Base(file)).
		Int("line", line).
		Str("log_type", "debug")

	if len(fields) > 0 {
		for key, value := range fields[0] {
			log = addField(log, key, value)
		}
	}
	log.Msg(message)
}

// LogErrorCtx logs error messages with context and optional fields
func LogErrorCtx(ctx context.Context, err error, message string, fields ...map[string]interface{}) {
	pc, file, line, _ := runtime.Caller(1)
	funcName := runtime.FuncForPC(pc).Name()

	log := FromContext(ctx).Error().
		Str("request_id", requestIDFromContext(ctx)).
		Str("function", funcName).
		Str("file", filepath.Base(file)).
		Int("line", line).
		Err(err)

	if len(fields) > 0 {
		for key, value := range fields[0] {
			log = addField(log, key, value)
		}
	}
	log.Msg(message)
}

// addField adds extra structured fields
func addField(event *zerolog.Event, key string, value interface{}) *zerolog.Event {
	switch v := value.(type) {
	case string:
		return event.Str(key, v)
	case int:
		return event.Int(key, v)
	case float64:
		return event.Float64(key, v)
	default:
		return event.Interface(key, v)
	}
}
