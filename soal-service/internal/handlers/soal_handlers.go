package handlers

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"strings"

	"soal-service/internal/logger"
	"soal-service/internal/services"
	"soal-service/internal/storage"

	"github.com/gin-gonic/gin"
)

type SoalHandler struct {
	soalService services.SoalService
}

const (
	maxCSVImportPartSize int64 = 5 * 1024 * 1024
	maxZIPImportPartSize int64 = 30 * 1024 * 1024
)

func NewSoalHandler(soalService services.SoalService) *SoalHandler {
	return &SoalHandler{soalService: soalService}
}

func (h *SoalHandler) GetSoalByPaketAndSubtest(c *gin.Context) {
	var paketSoal = c.Param("paket_soal")
	var subtest = c.Request.URL.Query().Get("subtest")

	soalGabungans, err := h.soalService.GetSoalByPaketAndSubtest(c, paketSoal, subtest)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get soal by paket and subtest", map[string]interface{}{"paket_soal": paketSoal, "subtest": subtest})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get soal by paket and subtest"})
		return
	}
	c.JSON(http.StatusOK, soalGabungans)
}

func (h *SoalHandler) GetAnswerKeyByPaketAndSubtest(c *gin.Context) {
	var paketSoal = c.Param("paket_soal")
	var subtest = c.Request.URL.Query().Get("subtest")

	answerKeys, err := h.soalService.GetAnswerKeyByPaketAndSubtest(c, paketSoal, subtest)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get answer key by paket and subtest", map[string]interface{}{"paket_soal": paketSoal, "subtest": subtest})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get answer key by paket and subtest"})
		return
	}
	c.JSON(http.StatusOK, answerKeys)
}

func (h *SoalHandler) GetMinatBakatSoal(c *gin.Context) {
	minatBakatSoal, err := h.soalService.GetMinatBakatSoal(c)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get minat bakat soal")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get minat bakat soal"})
		return
	}
	c.JSON(http.StatusOK, minatBakatSoal)
}

func (h *SoalHandler) UploadSoalImage(c *gin.Context) {
	kodeSoal := strings.TrimSpace(c.PostForm("kode_soal"))
	if kodeSoal == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "kode_soal is required"})
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}

	maxUploadSize := storage.GetMaxUploadSizeBytes()
	if fileHeader.Size > maxUploadSize {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "file too large"})
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to open uploaded file", map[string]interface{}{"kode_soal": kodeSoal})
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read uploaded file"})
		return
	}
	defer file.Close()

	raw, err := io.ReadAll(io.LimitReader(file, maxUploadSize+1))
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to read uploaded file content", map[string]interface{}{"kode_soal": kodeSoal})
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read uploaded file content"})
		return
	}
	if int64(len(raw)) > maxUploadSize {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "file too large"})
		return
	}

	result, err := h.soalService.UploadSoalImage(c, kodeSoal, raw)
	if err != nil {
		status := http.StatusInternalServerError
		msg := strings.ToLower(err.Error())
		switch {
		case strings.Contains(msg, "not found"):
			status = http.StatusNotFound
		case strings.Contains(msg, "unsupported image type"), strings.Contains(msg, "invalid image"), strings.Contains(msg, "required"):
			status = http.StatusBadRequest
		case strings.Contains(msg, "too large"):
			status = http.StatusRequestEntityTooLarge
		}

		logger.LogErrorCtx(c, err, "Failed to upload soal image", map[string]interface{}{"kode_soal": kodeSoal})
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *SoalHandler) GetSoalImageObject(c *gin.Context) {
	rawKey := strings.TrimPrefix(c.Param("object_key"), "/")
	if rawKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "object key is required"})
		return
	}

	decodedKey, err := url.PathUnescape(rawKey)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid object key"})
		return
	}

	reader, size, contentType, err := h.soalService.GetSoalImageObject(c, decodedKey)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get soal image object", map[string]interface{}{"object_key": decodedKey})
		c.JSON(http.StatusNotFound, gin.H{"error": "image not found"})
		return
	}
	defer reader.Close()

	c.Header("Cache-Control", "private, max-age=300")
	c.DataFromReader(http.StatusOK, size, contentType, reader, nil)
}

func (h *SoalHandler) ImportSoalCSV(c *gin.Context) {
	soalCSV, err := readOptionalCSVFile(c, "soal_csv")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if len(soalCSV) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "soal_csv is required"})
		return
	}

	result, err := h.soalService.ImportSoalFromCSV(c, services.CSVImportFiles{
		SoalCSV: soalCSV,
	})
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to import soal CSV")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "CSV import completed",
		"result":  result,
	})
}

func (h *SoalHandler) ImportSoalCSVBundle(c *gin.Context) {
	zipData, err := readOptionalFileByExt(c, "bundle_zip", maxZIPImportPartSize, ".zip")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if len(zipData) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bundle_zip is required"})
		return
	}

	result, err := h.soalService.ImportSoalFromZIPBundle(c, zipData)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to import soal ZIP bundle")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "ZIP bundle import completed",
		"result":  result,
	})
}

func readOptionalCSVFile(c *gin.Context, field string) ([]byte, error) {
	return readOptionalFileByExt(c, field, maxCSVImportPartSize, ".csv")
}

func readOptionalFileByExt(c *gin.Context, field string, maxSize int64, requiredExt string) ([]byte, error) {
	fileHeader, err := c.FormFile(field)
	if err != nil {
		if err == http.ErrMissingFile {
			return nil, nil
		}
		return nil, err
	}

	if fileHeader.Size > maxSize {
		return nil, fmt.Errorf("%s exceeds %d bytes", field, maxSize)
	}

	if !strings.HasSuffix(strings.ToLower(fileHeader.Filename), strings.ToLower(requiredExt)) {
		return nil, fmt.Errorf("%s must be a %s file", field, requiredExt)
	}

	content, err := readFileHeaderBytes(fileHeader, maxSize)
	if err != nil {
		return nil, err
	}

	return content, nil
}

func readFileHeaderBytes(fileHeader *multipart.FileHeader, maxSize int64) ([]byte, error) {
	file, err := fileHeader.Open()
	if err != nil {
		return nil, err
	}
	defer file.Close()

	raw, err := io.ReadAll(io.LimitReader(file, maxSize+1))
	if err != nil {
		return nil, err
	}

	if int64(len(raw)) > maxSize {
		return nil, fmt.Errorf("csv file exceeds %d bytes", maxSize)
	}

	return raw, nil
}
