package services

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"path"
	"regexp"
	"soal-service/internal/models"
	"soal-service/internal/storage"
	"soal-service/internal/utils"
	"sort"
	"strconv"
	"strings"
	"unicode"
)

const (
	maxCSVSizeBytes       = int64(5 * 1024 * 1024)
	maxCSVRows            = 5000
	maxZIPBundleSizeBytes = int64(30 * 1024 * 1024)
	maxZIPBundleFiles     = 2000
)

var inlineImageTokenPattern = regexp.MustCompile(`(?i)\[img:([^\]\r\n]+)\]`)

type CSVImportFiles struct {
	SoalCSV []byte
}

func (s *soalService) ImportSoalFromCSV(c context.Context, files CSVImportFiles) (*models.SoalCSVImportResult, error) {
	if len(files.SoalCSV) == 0 {
		return nil, fmt.Errorf("soal_csv is required")
	}

	if err := validateCSVPayloadSize(files); err != nil {
		return nil, err
	}

	input, warnings, err := buildImportInput(files)
	if err != nil {
		return nil, err
	}

	result, err := s.soalRepo.ImportSoalCSV(c, input)
	if err != nil {
		return nil, err
	}

	result.Warnings = warnings
	return result, nil
}

func (s *soalService) ImportSoalFromZIPBundle(c context.Context, zipData []byte) (*models.SoalCSVImportResult, error) {
	if len(zipData) == 0 {
		return nil, fmt.Errorf("zip bundle is required")
	}
	if int64(len(zipData)) > maxZIPBundleSizeBytes {
		return nil, fmt.Errorf("zip bundle exceeds %d bytes", maxZIPBundleSizeBytes)
	}

	csvData, imageMap, err := extractZIPBundle(zipData)
	if err != nil {
		return nil, err
	}

	input, warnings, err := buildImportInput(CSVImportFiles{SoalCSV: csvData})
	if err != nil {
		return nil, err
	}

	requiredImagePaths := make(map[string]string)
	addRequiredImagePath := func(rawPath, source string) error {
		normPath, err := normalizeBundleImagePath(rawPath)
		if err != nil {
			return fmt.Errorf("%s: %w", source, err)
		}
		if _, exists := requiredImagePaths[normPath]; !exists {
			requiredImagePaths[normPath] = source
		}
		return nil
	}
	collectRequiredFromText := func(value, source string) error {
		if strings.TrimSpace(value) == "" {
			return nil
		}
		_, err := rewriteInlineImageTokens(value, func(normPath string) (string, error) {
			if _, exists := requiredImagePaths[normPath]; !exists {
				requiredImagePaths[normPath] = source
			}
			return normPath, nil
		})
		if err != nil {
			return fmt.Errorf("%s: %w", source, err)
		}
		return nil
	}

	for _, soal := range input.Soals {
		if soal.PathGambarSoal != nil && strings.TrimSpace(*soal.PathGambarSoal) != "" {
			if err := addRequiredImagePath(*soal.PathGambarSoal, fmt.Sprintf("kode_soal %q image_path", soal.KodeSoal)); err != nil {
				return nil, err
			}
		}
		if err := collectRequiredFromText(soal.TextSoal, fmt.Sprintf("kode_soal %q text_soal", soal.KodeSoal)); err != nil {
			return nil, err
		}
		if soal.Pembahasan != nil {
			if err := collectRequiredFromText(*soal.Pembahasan, fmt.Sprintf("kode_soal %q pembahasan", soal.KodeSoal)); err != nil {
				return nil, err
			}
		}
	}

	for _, pilihan := range input.PilihanGandas {
		if err := collectRequiredFromText(pilihan.Pilihan, fmt.Sprintf("kode_soal %q pilihan_pilihan_ganda", pilihan.KodeSoal)); err != nil {
			return nil, err
		}
	}
	for _, tf := range input.TrueFalses {
		if err := collectRequiredFromText(tf.PilihanTf, fmt.Sprintf("kode_soal %q pilihan_true_false", tf.KodeSoal)); err != nil {
			return nil, err
		}
	}
	for _, uraian := range input.Uraians {
		if err := collectRequiredFromText(uraian.Jawaban, fmt.Sprintf("kode_soal %q jawaban_uraian", uraian.KodeSoal)); err != nil {
			return nil, err
		}
	}

	for imagePath, source := range requiredImagePaths {
		if _, ok := imageMap[imagePath]; !ok {
			return nil, fmt.Errorf("missing image file %q referenced by %s", imagePath, source)
		}
	}

	if len(requiredImagePaths) > 0 && s.imageStore == nil {
		return nil, fmt.Errorf("image storage is not configured")
	}

	pathsToUpload := make([]string, 0, len(requiredImagePaths))
	for p := range requiredImagePaths {
		pathsToUpload = append(pathsToUpload, p)
	}
	sort.Strings(pathsToUpload)

	uploadedObjectKeys := make([]string, 0, len(pathsToUpload))
	uploadedObjectByPath := make(map[string]string, len(pathsToUpload))

	for _, normPath := range pathsToUpload {
		rawImage := imageMap[normPath]

		converted, err := utils.ValidateAndConvertToWebP(rawImage, s.webpQuality, s.maxImageDim)
		if err != nil {
			cleanupUploadedObjects(c, s.imageStore, uploadedObjectKeys)
			return nil, fmt.Errorf("failed to process image %q referenced by %s: %w", normPath, requiredImagePaths[normPath], err)
		}

		hint := strings.TrimSuffix(path.Base(normPath), path.Ext(normPath))
		objectKey := storage.NewObjectKey(hint)
		if err := s.imageStore.UploadObject(c, objectKey, bytes.NewReader(converted.Data), int64(len(converted.Data)), converted.ContentType); err != nil {
			cleanupUploadedObjects(c, s.imageStore, uploadedObjectKeys)
			return nil, fmt.Errorf("failed to upload image %q referenced by %s: %w", normPath, requiredImagePaths[normPath], err)
		}

		uploadedObjectKeys = append(uploadedObjectKeys, objectKey)
		uploadedObjectByPath[normPath] = objectKey
	}

	rewriteTextWithUploadedKeys := func(value, source string) (string, error) {
		rewritten, err := rewriteInlineImageTokens(value, func(normPath string) (string, error) {
			objectKey, ok := uploadedObjectByPath[normPath]
			if !ok {
				return "", fmt.Errorf("missing uploaded image mapping for %q", normPath)
			}
			return objectKey, nil
		})
		if err != nil {
			return "", fmt.Errorf("%s: %w", source, err)
		}
		return rewritten, nil
	}

	for i := range input.Soals {
		if input.Soals[i].PathGambarSoal != nil && strings.TrimSpace(*input.Soals[i].PathGambarSoal) != "" {
			normPath, err := normalizeBundleImagePath(*input.Soals[i].PathGambarSoal)
			if err != nil {
				cleanupUploadedObjects(c, s.imageStore, uploadedObjectKeys)
				return nil, fmt.Errorf("kode_soal %q image_path: %w", input.Soals[i].KodeSoal, err)
			}
			objectKey, ok := uploadedObjectByPath[normPath]
			if !ok {
				cleanupUploadedObjects(c, s.imageStore, uploadedObjectKeys)
				return nil, fmt.Errorf("missing uploaded image for kode_soal %q at path %q", input.Soals[i].KodeSoal, normPath)
			}
			input.Soals[i].PathGambarSoal = &objectKey
		}

		rewrittenText, err := rewriteTextWithUploadedKeys(input.Soals[i].TextSoal, fmt.Sprintf("kode_soal %q text_soal", input.Soals[i].KodeSoal))
		if err != nil {
			cleanupUploadedObjects(c, s.imageStore, uploadedObjectKeys)
			return nil, err
		}
		input.Soals[i].TextSoal = rewrittenText

		if input.Soals[i].Pembahasan != nil {
			rewrittenPembahasan, err := rewriteTextWithUploadedKeys(*input.Soals[i].Pembahasan, fmt.Sprintf("kode_soal %q pembahasan", input.Soals[i].KodeSoal))
			if err != nil {
				cleanupUploadedObjects(c, s.imageStore, uploadedObjectKeys)
				return nil, err
			}
			input.Soals[i].Pembahasan = &rewrittenPembahasan
		}
	}

	for i := range input.PilihanGandas {
		rewrittenPilihan, err := rewriteTextWithUploadedKeys(input.PilihanGandas[i].Pilihan, fmt.Sprintf("kode_soal %q pilihan_pilihan_ganda", input.PilihanGandas[i].KodeSoal))
		if err != nil {
			cleanupUploadedObjects(c, s.imageStore, uploadedObjectKeys)
			return nil, err
		}
		input.PilihanGandas[i].Pilihan = rewrittenPilihan
	}

	for i := range input.TrueFalses {
		rewrittenPilihanTF, err := rewriteTextWithUploadedKeys(input.TrueFalses[i].PilihanTf, fmt.Sprintf("kode_soal %q pilihan_true_false", input.TrueFalses[i].KodeSoal))
		if err != nil {
			cleanupUploadedObjects(c, s.imageStore, uploadedObjectKeys)
			return nil, err
		}
		input.TrueFalses[i].PilihanTf = rewrittenPilihanTF
	}

	for i := range input.Uraians {
		rewrittenJawaban, err := rewriteTextWithUploadedKeys(input.Uraians[i].Jawaban, fmt.Sprintf("kode_soal %q jawaban_uraian", input.Uraians[i].KodeSoal))
		if err != nil {
			cleanupUploadedObjects(c, s.imageStore, uploadedObjectKeys)
			return nil, err
		}
		input.Uraians[i].Jawaban = rewrittenJawaban
	}

	result, err := s.soalRepo.ImportSoalCSV(c, input)
	if err != nil {
		cleanupUploadedObjects(c, s.imageStore, uploadedObjectKeys)
		return nil, err
	}

	warnings = append(warnings, fmt.Sprintf("bundle import processed %d image file(s)", len(uploadedObjectKeys)))
	result.Warnings = warnings
	return result, nil
}

func extractZIPBundle(zipData []byte) ([]byte, map[string][]byte, error) {
	reader, err := zip.NewReader(bytes.NewReader(zipData), int64(len(zipData)))
	if err != nil {
		return nil, nil, fmt.Errorf("invalid zip bundle: %w", err)
	}

	if len(reader.File) == 0 {
		return nil, nil, fmt.Errorf("zip bundle is empty")
	}
	if len(reader.File) > maxZIPBundleFiles {
		return nil, nil, fmt.Errorf("zip bundle contains too many files")
	}

	var csvData []byte
	imageMap := make(map[string][]byte)
	maxImageBytes := storage.GetMaxUploadSizeBytes()

	for _, file := range reader.File {
		if file.FileInfo().IsDir() {
			continue
		}

		normName := normalizeZIPPath(file.Name)
		if normName == "" {
			return nil, nil, fmt.Errorf("zip contains invalid file path")
		}

		lower := strings.ToLower(normName)
		switch {
		case strings.HasSuffix(lower, ".csv"):
			if csvData != nil {
				return nil, nil, fmt.Errorf("zip bundle must contain exactly one csv file")
			}
			content, err := readZIPFileLimited(file, maxCSVSizeBytes)
			if err != nil {
				return nil, nil, fmt.Errorf("failed reading csv from zip: %w", err)
			}
			csvData = content
		case isAllowedImageFile(lower):
			content, err := readZIPFileLimited(file, maxImageBytes)
			if err != nil {
				return nil, nil, fmt.Errorf("failed reading image %q from zip: %w", normName, err)
			}
			normImagePath, err := normalizeBundleImagePath(normName)
			if err != nil {
				return nil, nil, fmt.Errorf("invalid image path in zip %q: %w", normName, err)
			}
			if _, exists := imageMap[normImagePath]; exists {
				return nil, nil, fmt.Errorf("zip contains duplicate image path (case-insensitive): %q", normName)
			}
			imageMap[normImagePath] = content
		default:
			return nil, nil, fmt.Errorf("zip contains unsupported file type: %q", normName)
		}
	}

	if csvData == nil {
		return nil, nil, fmt.Errorf("zip bundle must contain one csv file")
	}

	return csvData, imageMap, nil
}

func readZIPFileLimited(file *zip.File, limit int64) ([]byte, error) {
	if file.UncompressedSize64 > uint64(limit) {
		return nil, fmt.Errorf("file %q exceeds size limit", file.Name)
	}

	rc, err := file.Open()
	if err != nil {
		return nil, err
	}
	defer rc.Close()

	data, err := io.ReadAll(io.LimitReader(rc, limit+1))
	if err != nil {
		return nil, err
	}
	if int64(len(data)) > limit {
		return nil, fmt.Errorf("file %q exceeds size limit", file.Name)
	}

	return data, nil
}

func isAllowedImageFile(fileName string) bool {
	return strings.HasSuffix(fileName, ".png") ||
		strings.HasSuffix(fileName, ".jpg") ||
		strings.HasSuffix(fileName, ".jpeg") ||
		strings.HasSuffix(fileName, ".webp") ||
		strings.HasSuffix(fileName, ".gif")
}

func normalizeZIPPath(raw string) string {
	cleaned := strings.TrimSpace(strings.ReplaceAll(raw, "\\", "/"))
	if cleaned == "" {
		return ""
	}

	norm := path.Clean(cleaned)
	if norm == "." || norm == "/" || strings.HasPrefix(norm, "../") || strings.HasPrefix(norm, "/") || strings.Contains(norm, ":") {
		return ""
	}

	return norm
}

func cleanupUploadedObjects(c context.Context, imageStore storage.ObjectStorage, keys []string) {
	if imageStore == nil {
		return
	}

	for _, key := range keys {
		_ = imageStore.DeleteObject(c, key)
	}
}

func validateCSVPayloadSize(files CSVImportFiles) error {
	if int64(len(files.SoalCSV)) > maxCSVSizeBytes {
		return fmt.Errorf("soal_csv exceeds %d bytes", maxCSVSizeBytes)
	}
	return nil
}

func buildImportInput(files CSVImportFiles) (*models.SoalCSVImportInput, []string, error) {
	rows, err := readCSVRows("soal_csv", files.SoalCSV,
		[]string{"kode_soal", "subtest", "tipe_soal", "text_soal", "bobot_soal", "is_image"},
		[]string{"pembahasan", "image_path", "pilihan_a", "pilihan_b", "pilihan_c", "pilihan_d", "pilihan_e", "kunci_pg", "pilihan_tf", "jawaban_tf", "jawaban_uraian"},
	)
	if err != nil {
		return nil, nil, err
	}

	input := &models.SoalCSVImportInput{
		PaketSoalID: "paket1",
		NamaPaket:   "Paket Soal Tryout",
	}
	warnings := make([]string, 0)

	validSubtests := map[string]struct{}{
		"subtest_pu":  {},
		"subtest_ppu": {},
		"subtest_pbm": {},
		"subtest_pk":  {},
		"subtest_lbi": {},
		"subtest_lbe": {},
		"subtest_pm":  {},
	}
	validTypes := map[string]struct{}{
		"multiple_choice": {},
		"true_false":      {},
		"short_answer":    {},
	}

	seenKodeSoal := make(map[string]struct{}, len(rows))

	for i, row := range rows {
		kodeSoal := normalizeCell(row["kode_soal"])
		subtest := normalizeCell(row["subtest"])
		tipeSoal := normalizeCell(row["tipe_soal"])
		textSoal := normalizeCell(row["text_soal"])
		bobotRaw := normalizeCell(row["bobot_soal"])
		isImageRaw := normalizeCell(row["is_image"])
		pembahasanRaw := strings.TrimSpace(row["pembahasan"])
		imagePathRaw := strings.TrimSpace(row["image_path"])

		pilihanA := normalizeCell(row["pilihan_a"])
		pilihanB := normalizeCell(row["pilihan_b"])
		pilihanC := normalizeCell(row["pilihan_c"])
		pilihanD := normalizeCell(row["pilihan_d"])
		pilihanE := normalizeCell(row["pilihan_e"])
		kunciPGRaw := strings.ToUpper(normalizeCell(row["kunci_pg"]))
		pilihanTF := normalizeCell(row["pilihan_tf"])
		jawabanTFRaw := normalizeCell(row["jawaban_tf"])
		jawabanUraian := normalizeCell(row["jawaban_uraian"])

		if kodeSoal == "" || subtest == "" || tipeSoal == "" || textSoal == "" || bobotRaw == "" || isImageRaw == "" {
			return nil, nil, fmt.Errorf("soal_csv row %d: required fields must be filled", i+2)
		}
		if _, ok := validSubtests[subtest]; !ok {
			return nil, nil, fmt.Errorf("soal_csv row %d: invalid subtest %q", i+2, subtest)
		}
		if _, ok := validTypes[tipeSoal]; !ok {
			return nil, nil, fmt.Errorf("soal_csv row %d: invalid tipe_soal %q", i+2, tipeSoal)
		}
		if _, exists := seenKodeSoal[kodeSoal]; exists {
			return nil, nil, fmt.Errorf("soal_csv row %d: duplicate kode_soal %q", i+2, kodeSoal)
		}

		bobot, err := strconv.Atoi(bobotRaw)
		if err != nil {
			return nil, nil, fmt.Errorf("soal_csv row %d: bobot_soal must be integer", i+2)
		}
		if bobot < 1 || bobot > 100 {
			return nil, nil, fmt.Errorf("soal_csv row %d: bobot_soal must be between 1 and 100", i+2)
		}

		isImage, err := parseBoolCell(isImageRaw)
		if err != nil {
			return nil, nil, fmt.Errorf("soal_csv row %d: invalid is_image: %v", i+2, err)
		}

		if isImage {
			if imagePathRaw == "" {
				return nil, nil, fmt.Errorf("soal_csv row %d: image_path is required when is_image=true", i+2)
			}
		} else if imagePathRaw != "" {
			warnings = append(warnings, fmt.Sprintf("soal_csv row %d: image_path ignored because is_image=false", i+2))
		}

		var pembahasan *string
		if pembahasanRaw != "" {
			clean := pembahasanRaw
			pembahasan = &clean
		}

		var gambar *string
		if isImage {
			if strings.Contains(imagePathRaw, "..") || strings.Contains(imagePathRaw, "\\") || strings.HasPrefix(imagePathRaw, "/") {
				return nil, nil, fmt.Errorf("soal_csv row %d: invalid image_path", i+2)
			}
			clean := imagePathRaw
			gambar = &clean
		}

		switch tipeSoal {
		case "multiple_choice":
			options := map[string]string{"A": pilihanA, "B": pilihanB, "C": pilihanC, "D": pilihanD, "E": pilihanE}
			filledCount := 0
			for _, val := range options {
				if val != "" {
					filledCount++
				}
			}
			if filledCount < 2 {
				return nil, nil, fmt.Errorf("soal_csv row %d: multiple_choice must contain at least 2 pilihan", i+2)
			}
			if kunciPGRaw == "" {
				return nil, nil, fmt.Errorf("soal_csv row %d: kunci_pg is required for multiple_choice", i+2)
			}

			selectedLabels, err := parseMultipleChoiceKeys(kunciPGRaw)
			if err != nil {
				return nil, nil, fmt.Errorf("soal_csv row %d: invalid kunci_pg: %v", i+2, err)
			}

			correctByLabel := make(map[string]struct{}, len(selectedLabels))
			for _, label := range selectedLabels {
				selectedOption := options[label]
				if selectedOption == "" {
					return nil, nil, fmt.Errorf("soal_csv row %d: kunci_pg must point to a non-empty pilihan (A-E)", i+2)
				}
				correctByLabel[label] = struct{}{}
			}

			labels := []string{"A", "B", "C", "D", "E"}
			for _, label := range labels {
				text := options[label]
				if text == "" {
					continue
				}
				_, isCorrect := correctByLabel[label]
				input.PilihanGandas = append(input.PilihanGandas, models.PilihanGandaImportRow{
					KodeSoal:  kodeSoal,
					Pilihan:   text,
					IsCorrect: isCorrect,
				})
			}
		case "true_false":
			if jawabanTFRaw == "" {
				return nil, nil, fmt.Errorf("soal_csv row %d: jawaban_tf is required for true_false", i+2)
			}
			jawabanTF, err := parseBoolCell(jawabanTFRaw)
			if err != nil {
				return nil, nil, fmt.Errorf("soal_csv row %d: invalid jawaban_tf: %v", i+2, err)
			}
			if pilihanTF == "" {
				pilihanTF = textSoal
			}
			input.TrueFalses = append(input.TrueFalses, models.TrueFalseImportRow{
				KodeSoal:  kodeSoal,
				PilihanTf: pilihanTF,
				Jawaban:   strconv.FormatBool(jawabanTF),
			})
		case "short_answer":
			if jawabanUraian == "" {
				return nil, nil, fmt.Errorf("soal_csv row %d: jawaban_uraian is required for short_answer", i+2)
			}
			input.Uraians = append(input.Uraians, models.UraianImportRow{KodeSoal: kodeSoal, Jawaban: jawabanUraian})
		}

		if tipeSoal != "multiple_choice" && (pilihanA != "" || pilihanB != "" || pilihanC != "" || pilihanD != "" || pilihanE != "" || kunciPGRaw != "") {
			warnings = append(warnings, fmt.Sprintf("soal_csv row %d: pilihan_a..e/kunci_pg ignored for tipe_soal=%s", i+2, tipeSoal))
		}
		if tipeSoal != "true_false" && (jawabanTFRaw != "" || pilihanTF != "") {
			warnings = append(warnings, fmt.Sprintf("soal_csv row %d: pilihan_tf/jawaban_tf ignored for tipe_soal=%s", i+2, tipeSoal))
		}
		if tipeSoal != "short_answer" && jawabanUraian != "" {
			warnings = append(warnings, fmt.Sprintf("soal_csv row %d: jawaban_uraian ignored for tipe_soal=%s", i+2, tipeSoal))
		}

		seenKodeSoal[kodeSoal] = struct{}{}
		input.Soals = append(input.Soals, models.SoalImportRow{
			KodeSoal:       kodeSoal,
			Subtest:        subtest,
			TipeSoal:       tipeSoal,
			TextSoal:       textSoal,
			PathGambarSoal: gambar,
			BobotSoal:      bobot,
			Pembahasan:     pembahasan,
		})
	}

	if len(input.Soals) == 0 {
		return nil, nil, fmt.Errorf("soal_csv must contain at least one data row")
	}

	return input, warnings, nil
}

func readCSVRows(name string, data []byte, requiredHeaders []string, optionalHeaders []string) ([]map[string]string, error) {
	if len(data) == 0 {
		return nil, nil
	}

	reader := csv.NewReader(bytes.NewReader(data))
	reader.FieldsPerRecord = -1
	reader.TrimLeadingSpace = true

	headers, err := reader.Read()
	if err != nil {
		if err == io.EOF {
			return nil, nil
		}
		return nil, fmt.Errorf("%s: failed to read header: %w", name, err)
	}

	if len(headers) == 0 {
		return nil, fmt.Errorf("%s: empty header", name)
	}

	headers[0] = strings.TrimPrefix(headers[0], "\ufeff")

	headerIndex := make(map[string]int, len(headers))
	for idx, h := range headers {
		normalized := normalizeCell(h)
		if normalized == "" {
			return nil, fmt.Errorf("%s: blank header at index %d", name, idx)
		}
		if _, exists := headerIndex[normalized]; exists {
			return nil, fmt.Errorf("%s: duplicate header %q", name, normalized)
		}
		headerIndex[normalized] = idx
	}

	for _, req := range requiredHeaders {
		if _, ok := headerIndex[req]; !ok {
			return nil, fmt.Errorf("%s: missing required header %q", name, req)
		}
	}

	allowedHeaders := make(map[string]struct{}, len(requiredHeaders)+len(optionalHeaders))
	for _, h := range requiredHeaders {
		allowedHeaders[h] = struct{}{}
	}
	for _, h := range optionalHeaders {
		allowedHeaders[h] = struct{}{}
	}
	for h := range headerIndex {
		if _, ok := allowedHeaders[h]; !ok {
			return nil, fmt.Errorf("%s: unknown header %q", name, h)
		}
	}

	rows := make([]map[string]string, 0)
	for rowNum := 2; ; rowNum++ {
		record, err := reader.Read()
		if err != nil {
			if err == io.EOF {
				break
			}
			return nil, fmt.Errorf("%s: failed to parse row %d: %w", name, rowNum, err)
		}

		if len(rows) >= maxCSVRows {
			return nil, fmt.Errorf("%s: row limit exceeded (%d)", name, maxCSVRows)
		}

		row := make(map[string]string, len(headerIndex))
		for h, idx := range headerIndex {
			if idx >= len(record) {
				row[h] = ""
				continue
			}
			row[h] = record[idx]
		}

		if isCompletelyBlankRow(row) {
			continue
		}

		rows = append(rows, row)
	}

	return rows, nil
}

func isCompletelyBlankRow(row map[string]string) bool {
	for _, value := range row {
		if strings.TrimSpace(value) != "" {
			return false
		}
	}
	return true
}

func normalizeCell(value string) string {
	return strings.TrimSpace(value)
}

func parseBoolCell(value string) (bool, error) {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "true", "1", "yes", "y":
		return true, nil
	case "false", "0", "no", "n":
		return false, nil
	default:
		return false, fmt.Errorf("boolean value must be one of true,false,1,0,yes,no")
	}
}

func parseMultipleChoiceKeys(value string) ([]string, error) {
	tokens := strings.FieldsFunc(strings.ToUpper(strings.TrimSpace(value)), func(r rune) bool {
		return r == '|' || r == ',' || r == ';' || r == '/' || unicode.IsSpace(r)
	})

	if len(tokens) == 0 {
		return nil, fmt.Errorf("must contain at least one key")
	}

	seen := make(map[string]struct{}, len(tokens))
	keys := make([]string, 0, len(tokens))
	for _, token := range tokens {
		t := strings.TrimSpace(token)
		if t == "" {
			continue
		}
		if len(t) != 1 || t[0] < 'A' || t[0] > 'E' {
			return nil, fmt.Errorf("key %q must be A-E", t)
		}
		if _, exists := seen[t]; exists {
			continue
		}
		seen[t] = struct{}{}
		keys = append(keys, t)
	}

	if len(keys) == 0 {
		return nil, fmt.Errorf("must contain at least one key")
	}

	return keys, nil
}

func normalizeBundleImagePath(raw string) (string, error) {
	normPath := normalizeZIPPath(raw)
	if normPath == "" {
		return "", fmt.Errorf("invalid image path %q", strings.TrimSpace(raw))
	}
	return strings.ToLower(normPath), nil
}

func rewriteInlineImageTokens(value string, replacer func(normalizedPath string) (string, error)) (string, error) {
	if !strings.Contains(strings.ToLower(value), "[img:") {
		return value, nil
	}

	var rewriteErr error
	rewritten := inlineImageTokenPattern.ReplaceAllStringFunc(value, func(token string) string {
		if rewriteErr != nil {
			return token
		}

		match := inlineImageTokenPattern.FindStringSubmatch(token)
		if len(match) < 2 {
			return token
		}

		normPath, err := normalizeBundleImagePath(match[1])
		if err != nil {
			rewriteErr = err
			return token
		}

		replacement, err := replacer(normPath)
		if err != nil {
			rewriteErr = err
			return token
		}

		return "[img:" + replacement + "]"
	})

	if rewriteErr != nil {
		return "", rewriteErr
	}

	return rewritten, nil
}
