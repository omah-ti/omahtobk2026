package repositories

import (
	"context"
	"soal-service/internal/logger"
	"soal-service/internal/models"

	"database/sql"

	"github.com/jmoiron/sqlx"
)

type SoalRepo interface {
	GetSoalByPaketAndSubtest(c context.Context, paketSoal, subtest string) ([]models.SoalGabungan, error)
	GetAnswerKeyByPaketAndSubtest(c context.Context, paketSoal, subtest string) (*models.AnswerKeys, error)
	GetMinatBakatSoal(c context.Context) ([]models.MinatBakatGabungan, error)
	GetSoalImagePathByKodeSoal(c context.Context, kodeSoal string) (*string, error)
	UpdateSoalImagePath(c context.Context, kodeSoal, objectKey string) error
}

type soalRepo struct {
	db *sqlx.DB
}

func NewSoalRepo(db *sqlx.DB) SoalRepo {
	return &soalRepo{db: db}
}

func (r *soalRepo) GetSoalByPaketAndSubtest(c context.Context, paketSoal, subtest string) ([]models.SoalGabungan, error) {
	// Map soal by kode_soal as key
	var mappedSoal = make(map[string]*models.SoalGabungan)

	query := `
		SELECT 
			s.kode_soal, s.paket_soal_id, s.subtest, s.text_soal, s.path_gambar_soal, 
			ppg.pilihan_pilihan_ganda_id, ppg.pilihan, 
			ptf.pilihan_true_false_id, ptf.pilihan_tf,
			u.uraian_id
		FROM soal s
		LEFT JOIN pilihan_pilihan_ganda ppg ON s.kode_soal = ppg.kode_soal
		LEFT JOIN pilihan_true_false ptf ON s.kode_soal = ptf.kode_soal
		LEFT JOIN uraian u ON s.kode_soal = u.kode_soal
		WHERE s.paket_soal_id = $1 AND s.subtest = $2
	`

	rows, err := r.db.Queryx(query, paketSoal, subtest)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to query soal by paket and subtest", map[string]interface{}{"paket_soal": paketSoal, "subtest": subtest})
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var soal models.SoalGabungan
		var pilihanGandaID, pilihanGandaPilihan sql.NullString
		var trueFalseID, trueFalsePilihan sql.NullString
		var uraianID sql.NullString

		err := rows.Scan(
			&soal.KodeSoal, &soal.PaketSoalID, &soal.Subtest, &soal.TextSoal, &soal.PathGambarSoal,
			&pilihanGandaID, &pilihanGandaPilihan,
			&trueFalseID, &trueFalsePilihan,
			&uraianID,
		)
		if err != nil {
			logger.LogErrorCtx(c, err, "Failed to scan soal by paket and subtest", map[string]interface{}{"paket_soal": paketSoal, "subtest": subtest})
			return nil, err
		}

		// Ensure soal exists in the map
		if _, exists := mappedSoal[soal.KodeSoal]; !exists {
			mappedSoal[soal.KodeSoal] = &soal
		}

		// Append choices only if not NULL
		if pilihanGandaID.Valid {
			mappedSoal[soal.KodeSoal].PilihanGanda = append(mappedSoal[soal.KodeSoal].PilihanGanda, models.PilihanPilihanGanda{
				PilihanPilihanGandaID: pilihanGandaID.String,
				Pilihan:               pilihanGandaPilihan.String,
			})
		}

		if trueFalseID.Valid {
			mappedSoal[soal.KodeSoal].TrueFalse = append(mappedSoal[soal.KodeSoal].TrueFalse, models.PilihanTrueFalse{
				PilihanTrueFalseID: trueFalseID.String,
				PilihanTf:          trueFalsePilihan.String,
			})
		}

		if uraianID.Valid {
			mappedSoal[soal.KodeSoal].Uraian = &models.Uraian{
				UraianID: uraianID.String,
			}
		}
	}

	// Convert map to slice
	var listSoal []models.SoalGabungan
	for _, soal := range mappedSoal {
		listSoal = append(listSoal, *soal)
	}
	logger.LogDebugCtx(c, "Soal retrieved successfully", map[string]interface{}{"paket_soal": paketSoal, "subtest": subtest})
	return listSoal, nil
}

func (r *soalRepo) GetAnswerKeyByPaketAndSubtest(c context.Context, paketSoal, subtest string) (*models.AnswerKeys, error) {
	answers := &models.AnswerKeys{
		PilihanGandaAnswers: make(map[string]map[string]struct {
			IsCorrect   bool
			Bobot       int
			TextPilihan string
		}),
		TrueFalseAnswers: make(map[string]struct {
			Jawaban     string
			Bobot       int
			TextPilihan string
		}),
		UraianAnswers: make(map[string]struct {
			Jawaban string
			Bobot   int
		}),
	}

	// 🔹 Pilihan Ganda
	pgQuery := `
		SELECT ppg.pilihan_pilihan_ganda_id, ppg.is_correct, s.bobot_soal, ppg.kode_soal, ppg.pilihan
		FROM pilihan_pilihan_ganda ppg
		JOIN soal s ON ppg.kode_soal = s.kode_soal
		WHERE s.paket_soal_id = $1 AND s.subtest = $2
	`
	pgRows, err := r.db.Queryx(pgQuery, paketSoal, subtest)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to query pilihan ganda by paket and subtest", map[string]interface{}{"paket_soal": paketSoal, "subtest": subtest})
		return nil, err
	}
	defer pgRows.Close()

	for pgRows.Next() {
		var pilihanGandaID string
		var isCorrect sql.NullBool
		var bobot int
		var kodeSoal string
		var textPilihan string
		if err := pgRows.Scan(&pilihanGandaID, &isCorrect, &bobot, &kodeSoal, &textPilihan); err != nil {
			logger.LogErrorCtx(c, err, "Failed to scan pilihan ganda by paket and subtest", map[string]interface{}{"paket_soal": paketSoal, "subtest": subtest})
			return nil, err
		}

		// If kodeSoal not exists, initialize it
		if _, exists := answers.PilihanGandaAnswers[kodeSoal]; !exists {
			answers.PilihanGandaAnswers[kodeSoal] = make(map[string]struct {
				IsCorrect   bool
				Bobot       int
				TextPilihan string
			})
		}

		// Add multiple choice answer inside the corresponding kode_soal
		answers.PilihanGandaAnswers[kodeSoal][pilihanGandaID] = struct {
			IsCorrect   bool
			Bobot       int
			TextPilihan string
		}{IsCorrect: isCorrect.Valid && isCorrect.Bool, Bobot: bobot, TextPilihan: textPilihan}
	}

	// 🔹 True False
	tfQuery := `
		SELECT ptf.jawaban, s.bobot_soal, ptf.kode_soal, ptf.pilihan_tf
		FROM pilihan_true_false ptf
		JOIN soal s ON ptf.kode_soal = s.kode_soal
		WHERE s.paket_soal_id = $1 AND s.subtest = $2
	`
	tfRows, err := r.db.Queryx(tfQuery, paketSoal, subtest)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to query true false by paket and subtest", map[string]interface{}{"paket_soal": paketSoal, "subtest": subtest})
		return nil, err
	}
	defer tfRows.Close()

	for tfRows.Next() {
		var jawaban string
		var bobot int
		var kodeSoal string
		var textPilihan string

		if err := tfRows.Scan(&jawaban, &bobot, &kodeSoal, &textPilihan); err != nil {
			logger.LogErrorCtx(c, err, "Failed to scan true false by paket and subtest", map[string]interface{}{"paket_soal": paketSoal, "subtest": subtest})
			return nil, err
		}

		// Store by kodeSoal
		answers.TrueFalseAnswers[kodeSoal] = struct {
			Jawaban     string
			Bobot       int
			TextPilihan string
		}{Jawaban: jawaban, Bobot: bobot, TextPilihan: textPilihan}
	}

	// 🔹 Uraian
	uraianQuery := `
		SELECT u.jawaban, s.bobot_soal, u.kode_soal
		FROM uraian u
		JOIN soal s ON u.kode_soal = s.kode_soal
		WHERE s.paket_soal_id = $1 AND s.subtest = $2
	`
	uraianRows, err := r.db.Queryx(uraianQuery, paketSoal, subtest)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to query uraian by paket and subtest", map[string]interface{}{"paket_soal": paketSoal, "subtest": subtest})
		return nil, err
	}
	defer uraianRows.Close()

	for uraianRows.Next() {
		var jawaban sql.NullString
		var bobot int
		var kodeSoal string

		if err := uraianRows.Scan(&jawaban, &bobot, &kodeSoal); err != nil {
			logger.LogErrorCtx(c, err, "Failed to scan uraian by paket and subtest", map[string]interface{}{"paket_soal": paketSoal, "subtest": subtest})
			return nil, err
		}

		// Store by kodeSoal
		answers.UraianAnswers[kodeSoal] = struct {
			Jawaban string
			Bobot   int
		}{Jawaban: jawaban.String, Bobot: bobot}
	}

	logger.LogDebugCtx(c, "Answer keys retrieved successfully", map[string]interface{}{"paket_soal": paketSoal, "subtest": subtest})

	return answers, nil
}

func (r *soalRepo) GetMinatBakatSoal(c context.Context) ([]models.MinatBakatGabungan, error) {
	var mappedSoal = make(map[string]*models.MinatBakatGabungan)
	// query
	query := `
			SELECT 
				mb.kode_soal, mb.text_soal, mbp.text_pilihan, mbp.divisi, mbp.pilihan_id
				FROM minat_bakat_soal mb
				LEFT JOIN minat_bakat_pilihan mbp ON mb.kode_soal = mbp.kode_soal
		`

	// execute query
	rows, err := r.db.Queryx(query)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to query minat bakat soal")
		return nil, err
	}
	defer rows.Close()

	// scan them rows, and map them to the struct
	for rows.Next() {
		var pilihan models.MinatBakatPilihan
		var soalID string
		var textSoal string

		// scan the rows, making sure the data is not nil
		err := rows.Scan(&soalID, &textSoal, &pilihan.TextPilihan, &pilihan.Divisi, &pilihan.PilihanID)
		if err != nil {
			logger.LogErrorCtx(c, err, "Failed to scan minat bakat soal")
			return nil, err
		}

		// if the soalID is doesn't exists, make a map for that soal ID
		if _, exists := mappedSoal[soalID]; !exists {
			// mapped based on the struct of the models type stuff
			mappedSoal[soalID] = &models.MinatBakatGabungan{
				MinatBakatSoal: models.MinatBakatSoal{
					KodeSoal: soalID,
					TextSoal: textSoal,
				},
				Pilihan: []models.MinatBakatPilihan{},
			}
		}
		// append the pilihan to the soal, if the pilihanID is not empty
		if pilihan.PilihanID != "" {
			mappedSoal[soalID].Pilihan = append(mappedSoal[soalID].Pilihan, pilihan)
		}
	}

	// convert the map to slice
	var results []models.MinatBakatGabungan
	// iterate the map and append it to the slice
	for _, soal := range mappedSoal {
		results = append(results, *soal)
	}

	// return the slice
	return results, nil
}

func (r *soalRepo) GetSoalImagePathByKodeSoal(c context.Context, kodeSoal string) (*string, error) {
	var path sql.NullString

	query := `SELECT path_gambar_soal FROM soal WHERE kode_soal = $1`
	if err := r.db.QueryRowx(query, kodeSoal).Scan(&path); err != nil {
		if err == sql.ErrNoRows {
			return nil, sql.ErrNoRows
		}
		logger.LogErrorCtx(c, err, "Failed to get soal image path", map[string]interface{}{"kode_soal": kodeSoal})
		return nil, err
	}

	if !path.Valid || path.String == "" {
		return nil, nil
	}

	result := path.String
	return &result, nil
}

func (r *soalRepo) UpdateSoalImagePath(c context.Context, kodeSoal, objectKey string) error {
	query := `UPDATE soal SET path_gambar_soal = $1 WHERE kode_soal = $2`
	res, err := r.db.ExecContext(c, query, objectKey, kodeSoal)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to update soal image path", map[string]interface{}{"kode_soal": kodeSoal})
		return err
	}

	rowsAffected, err := res.RowsAffected()
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to read updated rows for soal image path", map[string]interface{}{"kode_soal": kodeSoal})
		return err
	}

	if rowsAffected == 0 {
		return sql.ErrNoRows
	}

	return nil
}
