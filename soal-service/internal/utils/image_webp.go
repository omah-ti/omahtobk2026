package utils

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"net/http"

	"github.com/chai2010/webp"
	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp"
)

const maxDecodePixels = 25_000_000

type ConvertedImage struct {
	Data        []byte
	ContentType string
	Width       int
	Height      int
}

func ValidateAndConvertToWebP(raw []byte, quality float32, maxDimension int) (*ConvertedImage, error) {
	if len(raw) == 0 {
		return nil, errors.New("empty file")
	}

	contentType := http.DetectContentType(raw)
	if contentType != "image/jpeg" && contentType != "image/png" && contentType != "image/webp" {
		return nil, fmt.Errorf("unsupported image type: %s", contentType)
	}

	config, _, err := image.DecodeConfig(bytes.NewReader(raw))
	if err != nil {
		return nil, fmt.Errorf("invalid image: %w", err)
	}
	if config.Width <= 0 || config.Height <= 0 {
		return nil, errors.New("invalid image dimensions")
	}
	if config.Width*config.Height > maxDecodePixels {
		return nil, errors.New("image dimensions are too large")
	}

	img, _, err := image.Decode(bytes.NewReader(raw))
	if err != nil {
		return nil, fmt.Errorf("failed to decode image: %w", err)
	}

	resized := img
	outWidth, outHeight := config.Width, config.Height
	if maxDimension > 0 && (config.Width > maxDimension || config.Height > maxDimension) {
		outWidth, outHeight = scaledDimensions(config.Width, config.Height, maxDimension)
		dst := image.NewRGBA(image.Rect(0, 0, outWidth, outHeight))
		draw.CatmullRom.Scale(dst, dst.Bounds(), img, img.Bounds(), draw.Over, nil)
		resized = dst
	}

	var buffer bytes.Buffer
	err = webp.Encode(&buffer, resized, &webp.Options{
		Lossless: false,
		Quality:  quality,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to encode webp: %w", err)
	}

	if buffer.Len() == 0 {
		return nil, errors.New("generated webp is empty")
	}

	return &ConvertedImage{
		Data:        buffer.Bytes(),
		ContentType: "image/webp",
		Width:       outWidth,
		Height:      outHeight,
	}, nil
}

func scaledDimensions(width, height, maxDimension int) (int, int) {
	if width <= maxDimension && height <= maxDimension {
		return width, height
	}
	if width >= height {
		newWidth := maxDimension
		newHeight := int(float64(height) * (float64(maxDimension) / float64(width)))
		if newHeight < 1 {
			newHeight = 1
		}
		return newWidth, newHeight
	}

	newHeight := maxDimension
	newWidth := int(float64(width) * (float64(maxDimension) / float64(height)))
	if newWidth < 1 {
		newWidth = 1
	}
	return newWidth, newHeight
}
