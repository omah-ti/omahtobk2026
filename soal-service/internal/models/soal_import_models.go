package models

type SoalCSVImportInput struct {
	PaketSoalID   string
	NamaPaket     string
	Soals         []SoalImportRow
	PilihanGandas []PilihanGandaImportRow
	TrueFalses    []TrueFalseImportRow
	Uraians       []UraianImportRow
}

type SoalImportRow struct {
	KodeSoal       string
	Subtest        string
	TipeSoal       string
	TextSoal       string
	PathGambarSoal *string
	BobotSoal      int
	Pembahasan     *string
}

type PilihanGandaImportRow struct {
	KodeSoal    string
	OptionOrder int
	Pilihan     string
	IsCorrect   bool
}

type TrueFalseImportRow struct {
	KodeSoal  string
	PilihanTf string
	Jawaban   string
}

type UraianImportRow struct {
	KodeSoal string
	Jawaban  string
}

type SoalCSVImportResult struct {
	PaketSoalID       string   `json:"paket_soal_id"`
	SoalCount         int      `json:"soal_count"`
	PilihanGandaCount int      `json:"pilihan_ganda_count"`
	TrueFalseCount    int      `json:"true_false_count"`
	UraianCount       int      `json:"uraian_count"`
	Warnings          []string `json:"warnings,omitempty"`
}
