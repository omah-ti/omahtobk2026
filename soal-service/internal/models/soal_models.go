package models

type PaketSoal struct {
	PaketSoalID string `json:"paket_soal_id" db:"paket_soal_id" binding:"required"`
	NamaPaket   string `json:"nama_paket" db:"nama_paket" binding:"required"`
}

type Soal struct {
	KodeSoal       string  `json:"kode_soal" db:"kode_soal" binding:"required"`
	PaketSoalID    string  `json:"paket_soal_id" db:"paket_soal_id" binding:"required"`
	Subtest        string  `json:"subtest" db:"subtest" binding:"required"`
	TipeSoal       string  `json:"tipe_soal" db:"tipe_soal" binding:"required"`
	TextSoal       string  `json:"text_soal" db:"text_soal" binding:"required"`
	PathGambarSoal *string `json:"path_gambar_soal" db:"path_gambar_soal"`
	BobotSoal      int     `json:"bobot_soal" db:"bobot_soal" binding:"required"`
}

type PilihanPilihanGanda struct {
	PilihanPilihanGandaID string `json:"soal_pilihan_ganda_id" db:"soal_pilihan_ganda_id" binding:"required"`
	KodeSoal              string `json:"kode_soal" db:"kode_soal" binding:"required"`
	Pilihan               string `json:"pilihan" db:"pilihan" binding:"required"`
	IsCorrect             bool   `json:"is_correct" db:"is_correct" binding:"required"`
}

type PilihanTrueFalse struct {
	PilihanTrueFalseID string `json:"soal_true_false_id" db:"soal_true_false_id" binding:"required"`
	KodeSoal           string `json:"kode_soal" db:"kode_soal" binding:"required"`
	PilihanTf          string `json:"pilihan_tf" db:"pilihan_tf" binding:"required"`
	Jawaban            string `json:"jawaban" db:"jawaban" binding:"required"`
}

type Uraian struct {
	UraianID string `json:"soal_uraian_id" db:"soal_uraian_id" binding:"required"`
	KodeSoal string `json:"kode_soal" db:"kode_soal" binding:"required"`
	Jawaban  string `json:"jawaban" db:"jawaban" binding:"required"`
}

type SoalGabungan struct {
	Soal
	PilihanGanda []PilihanPilihanGanda `json:"pilihan_ganda,omitempty"`
	TrueFalse    []PilihanTrueFalse    `json:"true_false,omitempty"`
	Uraian       *Uraian               `json:"uraian,omitempty"`
}

type AnswerKeys struct {
	PilihanGandaAnswers map[string]map[string]struct { // Now groups by KodeSoal
		IsCorrect   bool
		Bobot       int
		TextPilihan string
	} `json:"pilihan_ganda,omitempty"`

	TrueFalseAnswers map[string]struct { // Now groups by KodeSoal
		Jawaban     string
		Bobot       int
		TextPilihan string
	} `json:"true_false,omitempty"`

	UraianAnswers map[string]struct { // Now groups by KodeSoal
		Jawaban string
		Bobot   int
	} `json:"uraian,omitempty"`
}

type MinatBakatSoal struct {
	KodeSoal string `json:"kode_soal" db:"kode_soal" binding:"required"`
	TextSoal string `json:"text_soal" db:"text_soal" binding:"required"`
}

type MinatBakatPilihan struct {
	PilihanID   string `json:"pilihan_id" db:"pilihan_id" binding:"required"`
	KodeSoal    string `json:"kode_soal" db:"kode_soal" binding:"required"`
	TextPilihan string `json:"text_pilihan" db:"text_pilihan" binding:"required"`
	Divisi      string `json:"divisi" db:"divisi" binding:"required"`
}

type MinatBakatGabungan struct {
	MinatBakatSoal
	Pilihan []MinatBakatPilihan `json:"pilihan,omitempty"`
}
