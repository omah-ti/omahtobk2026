package storage

import (
	"context"
	"fmt"
	"io"
	"net/url"
	"os"
	"path"
	"regexp"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type ObjectStorage interface {
	UploadObject(ctx context.Context, objectKey string, content io.Reader, size int64, contentType string) error
	GetObject(ctx context.Context, objectKey string) (io.ReadCloser, int64, string, error)
	DeleteObject(ctx context.Context, objectKey string) error
	BuildProxyURL(objectKey string) string
}

type MinIOStorage struct {
	client       *minio.Client
	bucket       string
	imageBaseURL string
}

func NewMinIOStorageFromEnv(ctx context.Context) (*MinIOStorage, error) {
	endpoint := getEnv("MINIO_ENDPOINT", "minio:9000")
	accessKey := getEnv("MINIO_ACCESS_KEY", "minioadmin")
	secretKey := getEnv("MINIO_SECRET_KEY", "minioadmin")
	useSSL := getEnvAsBool("MINIO_USE_SSL", false)
	bucket := getEnv("MINIO_BUCKET_SOAL", "soal-images")
	imageBaseURL := strings.TrimRight(getEnv("SOAL_IMAGE_BASE_URL", "http://localhost:8080"), "/")

	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("failed creating minio client: %w", err)
	}

	exists, err := client.BucketExists(ctx, bucket)
	if err != nil {
		return nil, fmt.Errorf("failed checking minio bucket: %w", err)
	}
	if !exists {
		if err := client.MakeBucket(ctx, bucket, minio.MakeBucketOptions{}); err != nil {
			return nil, fmt.Errorf("failed creating minio bucket: %w", err)
		}
	}

	return &MinIOStorage{
		client:       client,
		bucket:       bucket,
		imageBaseURL: imageBaseURL,
	}, nil
}

func (s *MinIOStorage) UploadObject(ctx context.Context, objectKey string, content io.Reader, size int64, contentType string) error {
	_, err := s.client.PutObject(ctx, s.bucket, objectKey, content, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return fmt.Errorf("failed uploading object: %w", err)
	}
	return nil
}

func (s *MinIOStorage) GetObject(ctx context.Context, objectKey string) (io.ReadCloser, int64, string, error) {
	candidates := buildObjectKeyCandidates(objectKey)
	var lastErr error

	for _, candidate := range candidates {
		stat, err := s.client.StatObject(ctx, s.bucket, candidate, minio.StatObjectOptions{})
		if err != nil {
			lastErr = err
			continue
		}

		obj, err := s.client.GetObject(ctx, s.bucket, candidate, minio.GetObjectOptions{})
		if err != nil {
			lastErr = err
			continue
		}

		contentType := stat.ContentType
		if contentType == "" {
			contentType = "application/octet-stream"
		}

		return obj, stat.Size, contentType, nil
	}

	if lastErr != nil {
		return nil, 0, "", fmt.Errorf("failed stat object: %w", lastErr)
	}

	return nil, 0, "", fmt.Errorf("failed stat object: object not found")
}

func (s *MinIOStorage) DeleteObject(ctx context.Context, objectKey string) error {
	err := s.client.RemoveObject(ctx, s.bucket, objectKey, minio.RemoveObjectOptions{})
	if err != nil {
		return fmt.Errorf("failed removing object: %w", err)
	}
	return nil
}

func (s *MinIOStorage) BuildProxyURL(objectKey string) string {
	escapedObjectKey := url.PathEscape(strings.TrimLeft(objectKey, "/"))
	return fmt.Sprintf("%s/api/soal/images/object/%s", s.imageBaseURL, escapedObjectKey)
}

func getEnv(key, fallback string) string {
	if val := strings.TrimSpace(os.Getenv(key)); val != "" {
		return val
	}
	return fallback
}

func getEnvAsBool(key string, fallback bool) bool {
	val := strings.TrimSpace(os.Getenv(key))
	if val == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(val)
	if err != nil {
		return fallback
	}
	return parsed
}

func GetMaxUploadSizeBytes() int64 {
	maxMB := int64(8)
	if raw := strings.TrimSpace(os.Getenv("IMAGE_MAX_UPLOAD_MB")); raw != "" {
		if v, err := strconv.ParseInt(raw, 10, 64); err == nil && v > 0 {
			maxMB = v
		}
	}
	return maxMB * 1024 * 1024
}

func GetWebPQuality() float32 {
	quality := float32(80)
	if raw := strings.TrimSpace(os.Getenv("IMAGE_WEBP_QUALITY")); raw != "" {
		if v, err := strconv.ParseFloat(raw, 32); err == nil && v >= 1 && v <= 100 {
			quality = float32(v)
		}
	}
	return quality
}

func GetMaxImageDimension() int {
	dim := 2048
	if raw := strings.TrimSpace(os.Getenv("IMAGE_MAX_DIMENSION")); raw != "" {
		if v, err := strconv.Atoi(raw); err == nil && v > 0 {
			dim = v
		}
	}
	return dim
}

func NewObjectKey(kodeSoal string) string {
	sanitizedKode := strings.ReplaceAll(strings.ToLower(strings.TrimSpace(kodeSoal)), " ", "-")
	if sanitizedKode == "" {
		sanitizedKode = "unknown"
	}
	return fmt.Sprintf("soal/%s/%s.webp", sanitizedKode, uuid.NewString())
}

var storageUnsafePathCharPattern = regexp.MustCompile(`[^a-z0-9._-]+`)
var uuidObjectKeyPattern = regexp.MustCompile(`^(soal/.+)/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$`)

func buildObjectKeyCandidates(objectKey string) []string {
	primary := strings.TrimSpace(strings.TrimLeft(objectKey, "/"))
	if primary == "" {
		return nil
	}

	candidates := []string{primary}

	if matches := uuidObjectKeyPattern.FindStringSubmatch(strings.ToLower(primary)); len(matches) == 2 {
		legacyKey := strings.TrimSpace(matches[1]) + ".webp"
		if legacyKey != "" && legacyKey != primary {
			candidates = append(candidates, legacyKey)
		}
	}

	return candidates
}

func sanitizeObjectKeySegment(raw string) string {
	trimmed := strings.TrimSpace(strings.ToLower(raw))
	if trimmed == "" {
		return "unknown"
	}

	sanitized := storageUnsafePathCharPattern.ReplaceAllString(trimmed, "-")
	sanitized = strings.Trim(sanitized, "-._")
	if sanitized == "" {
		return "unknown"
	}

	return sanitized
}

func NewObjectKeyFromBundlePath(bundlePath string) string {
	normalized := strings.TrimSpace(strings.ReplaceAll(bundlePath, "\\", "/"))
	normalized = strings.TrimPrefix(normalized, "./")
	normalized = strings.TrimLeft(normalized, "/")
	normalized = strings.ToLower(path.Clean(normalized))

	if normalized == "" || normalized == "." || normalized == "/" {
		return fmt.Sprintf("soal/image/%s.webp", uuid.NewString())
	}

	if strings.HasPrefix(normalized, "images/") {
		normalized = strings.TrimPrefix(normalized, "images/")
	}

	segments := strings.Split(normalized, "/")
	sanitizedSegments := make([]string, 0, len(segments))
	for _, segment := range segments {
		segment = strings.TrimSpace(segment)
		if segment == "" || segment == "." {
			continue
		}

		ext := path.Ext(segment)
		if ext != "" {
			segment = strings.TrimSuffix(segment, ext)
		}

		sanitizedSegments = append(sanitizedSegments, sanitizeObjectKeySegment(segment))
	}

	if len(sanitizedSegments) == 0 {
		return fmt.Sprintf("soal/image/%s.webp", uuid.NewString())
	}

	return "soal/" + strings.Join(sanitizedSegments, "/") + ".webp"
}
