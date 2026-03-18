package handlers

import (
	"io"
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
