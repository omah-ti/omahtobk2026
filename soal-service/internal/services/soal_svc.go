package services

import (
	"bytes"
	"context"
	"database/sql"
	"fmt"
	"io"
	"soal-service/internal/logger"
	"soal-service/internal/models"
	"soal-service/internal/repositories"
	"soal-service/internal/storage"
	"soal-service/internal/utils"
	"strings"
)

type SoalService interface {
	GetSoalByPaketAndSubtest(c context.Context, paketSoal, subtest string) ([]models.SoalGabungan, error)
	GetAnswerKeyByPaketAndSubtest(c context.Context, paketSoal, subtest string) (*models.AnswerKeys, error)
	GetMinatBakatSoal(c context.Context) ([]models.MinatBakatGabungan, error)
	UploadSoalImage(c context.Context, kodeSoal string, raw []byte) (map[string]interface{}, error)
	GetSoalImageObject(c context.Context, objectKey string) (io.ReadCloser, int64, string, error)
	ImportSoalFromCSV(c context.Context, files CSVImportFiles) (*models.SoalCSVImportResult, error)
	ImportSoalFromZIPBundle(c context.Context, zipData []byte) (*models.SoalCSVImportResult, error)
}

type soalService struct {
	soalRepo    repositories.SoalRepo
	imageStore  storage.ObjectStorage
	webpQuality float32
	maxImageDim int
}

func NewSoalService(soalRepo repositories.SoalRepo, imageStore storage.ObjectStorage) SoalService {
	return &soalService{
		soalRepo:    soalRepo,
		imageStore:  imageStore,
		webpQuality: storage.GetWebPQuality(),
		maxImageDim: storage.GetMaxImageDimension(),
	}
}

func (s *soalService) GetSoalByPaketAndSubtest(c context.Context, paketSoal, subtest string) ([]models.SoalGabungan, error) {
	soalGabungans, err := s.soalRepo.GetSoalByPaketAndSubtest(c, paketSoal, subtest)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get soal by paket and subtest", map[string]interface{}{"paket_soal": paketSoal, "subtest": subtest})
		return nil, err
	}

	for i := range soalGabungans {
		soalGabungans[i].TextSoal = rewriteInlineImageTokensToProxyURL(soalGabungans[i].TextSoal, s.imageStore)

		for j := range soalGabungans[i].PilihanGanda {
			soalGabungans[i].PilihanGanda[j].Pilihan = rewriteInlineImageTokensToProxyURL(soalGabungans[i].PilihanGanda[j].Pilihan, s.imageStore)
		}

		for j := range soalGabungans[i].TrueFalse {
			soalGabungans[i].TrueFalse[j].PilihanTf = rewriteInlineImageTokensToProxyURL(soalGabungans[i].TrueFalse[j].PilihanTf, s.imageStore)
		}

		if soalGabungans[i].Uraian != nil {
			soalGabungans[i].Uraian.Jawaban = rewriteInlineImageTokensToProxyURL(soalGabungans[i].Uraian.Jawaban, s.imageStore)
		}

		if soalGabungans[i].PathGambarSoal == nil || strings.TrimSpace(*soalGabungans[i].PathGambarSoal) == "" {
			continue
		}

		currentPath := strings.TrimSpace(*soalGabungans[i].PathGambarSoal)
		if isAbsoluteURL(currentPath) {
			continue
		}

		if s.imageStore == nil {
			continue
		}

		proxyURL := s.imageStore.BuildProxyURL(currentPath)
		soalGabungans[i].PathGambarSoal = &proxyURL
	}

	return soalGabungans, nil
}

func (s *soalService) GetAnswerKeyByPaketAndSubtest(c context.Context, paketSoal, subtest string) (*models.AnswerKeys, error) {
	answerKeys, err := s.soalRepo.GetAnswerKeyByPaketAndSubtest(c, paketSoal, subtest)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get answer key by paket and subtest", map[string]interface{}{"paket_soal": paketSoal, "subtest": subtest})
		return nil, err
	}

	return answerKeys, nil
}

func (s *soalService) GetMinatBakatSoal(c context.Context) ([]models.MinatBakatGabungan, error) {
	minatBakatSoal, err := s.soalRepo.GetMinatBakatSoal(c)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get minat bakat soal")
		return nil, err
	}

	return minatBakatSoal, nil
}

func (s *soalService) UploadSoalImage(c context.Context, kodeSoal string, raw []byte) (map[string]interface{}, error) {
	if s.imageStore == nil {
		return nil, fmt.Errorf("image storage is not configured")
	}

	kodeSoal = strings.TrimSpace(kodeSoal)
	if kodeSoal == "" {
		return nil, fmt.Errorf("kode_soal is required")
	}

	converted, err := utils.ValidateAndConvertToWebP(raw, s.webpQuality, s.maxImageDim)
	if err != nil {
		return nil, err
	}

	oldPath, err := s.soalRepo.GetSoalImagePathByKodeSoal(c, kodeSoal)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("soal not found")
		}
		return nil, err
	}

	objectKey := storage.NewObjectKey(kodeSoal)
	if err := s.imageStore.UploadObject(c, objectKey, bytes.NewReader(converted.Data), int64(len(converted.Data)), converted.ContentType); err != nil {
		return nil, err
	}

	if err := s.soalRepo.UpdateSoalImagePath(c, kodeSoal, objectKey); err != nil {
		_ = s.imageStore.DeleteObject(c, objectKey)
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("soal not found")
		}
		return nil, err
	}

	if oldPath != nil {
		oldKey := strings.TrimSpace(*oldPath)
		if oldKey != "" && !isAbsoluteURL(oldKey) && oldKey != objectKey {
			if err := s.soalRepo.ReplaceInlineImageObjectKeyReferences(c, kodeSoal, oldKey, objectKey); err != nil {
				logger.LogErrorCtx(c, err, "Failed to sync inline image references after upload", map[string]interface{}{"kode_soal": kodeSoal})
			}
		}
	}

	if oldPath != nil && strings.TrimSpace(*oldPath) != "" && !isAbsoluteURL(*oldPath) && strings.TrimSpace(*oldPath) != objectKey {
		if err := s.imageStore.DeleteObject(c, strings.TrimSpace(*oldPath)); err != nil {
			logger.LogErrorCtx(c, err, "Failed deleting previous soal image", map[string]interface{}{"kode_soal": kodeSoal})
		}
	}

	return map[string]interface{}{
		"kode_soal":        kodeSoal,
		"object_key":       objectKey,
		"path_gambar_soal": s.imageStore.BuildProxyURL(objectKey),
		"content_type":     converted.ContentType,
		"width":            converted.Width,
		"height":           converted.Height,
		"size_bytes":       len(converted.Data),
	}, nil
}

func (s *soalService) GetSoalImageObject(c context.Context, objectKey string) (io.ReadCloser, int64, string, error) {
	if s.imageStore == nil {
		return nil, 0, "", fmt.Errorf("image storage is not configured")
	}

	key := strings.TrimSpace(strings.TrimLeft(objectKey, "/"))
	if key == "" {
		return nil, 0, "", fmt.Errorf("object key is required")
	}
	if strings.Contains(key, "..") {
		return nil, 0, "", fmt.Errorf("invalid object key")
	}

	return s.imageStore.GetObject(c, key)
}

func isAbsoluteURL(path string) bool {
	trimmed := strings.TrimSpace(strings.ToLower(path))
	return strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://")
}

func rewriteInlineImageTokensToProxyURL(value string, imageStore storage.ObjectStorage) string {
	if imageStore == nil || !strings.Contains(strings.ToLower(value), "[img:") {
		return value
	}

	return inlineImageTokenPattern.ReplaceAllStringFunc(value, func(token string) string {
		match := inlineImageTokenPattern.FindStringSubmatch(token)
		if len(match) < 2 {
			return token
		}

		mode, imgPath := parseInlineImageTokenPath(match[1])
		if imgPath == "" || isAbsoluteURL(imgPath) {
			return token
		}

		proxyURL := imageStore.BuildProxyURL(strings.TrimLeft(imgPath, "/"))
		return "[img:" + buildImageTokenPayload(mode, proxyURL) + "]"
	})
}

func parseInlineImageTokenPath(raw string) (string, string) {
	payload := strings.TrimSpace(raw)
	if payload == "" {
		return imageTokenModeInline, ""
	}

	mode := imageTokenModeInline
	if idx := strings.Index(payload, ":"); idx > 0 {
		prefix := strings.ToLower(strings.TrimSpace(payload[:idx]))
		if prefix == imageTokenModeInline || prefix == imageTokenModeBlock {
			mode = prefix
			payload = strings.TrimSpace(payload[idx+1:])
		}
	}

	return mode, payload
}
