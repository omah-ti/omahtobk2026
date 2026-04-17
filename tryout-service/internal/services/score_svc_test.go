package services

import (
	"testing"
	"tryout-service/internal/models"
)

func TestParseAnswerIDSet_MixedDelimiters(t *testing.T) {
	set := parseAnswerIDSet("id-a, id-b|id-c ; id-d / id-e")

	for _, expected := range []string{"id-a", "id-b", "id-c", "id-d", "id-e"} {
		if _, ok := set[expected]; !ok {
			t.Fatalf("expected token %q to exist", expected)
		}
	}

	if len(set) != 5 {
		t.Fatalf("expected 5 unique tokens, got %d", len(set))
	}
}

func TestIsEquivalentTrueFalseAnswer_BooleanForms(t *testing.T) {
	if !isEquivalentTrueFalseAnswer("benar", "true") {
		t.Fatal("expected benar and true to be equivalent")
	}

	if isEquivalentTrueFalseAnswer("salah", "true") {
		t.Fatal("expected salah and true to be non-equivalent")
	}
}

func TestIsEquivalentTrueFalseAnswer_IDSetOrderInsensitive(t *testing.T) {
	if !isEquivalentTrueFalseAnswer("tf-b, tf-a", "tf-a|tf-b") {
		t.Fatal("expected equal ID sets despite different delimiter/order")
	}

	if isEquivalentTrueFalseAnswer("tf-a", "tf-a|tf-b") {
		t.Fatal("expected non-equivalent for partial set")
	}
}

func TestIsEquivalentTrueFalseAnswer_KeyBoolAcceptsTransitionFormats(t *testing.T) {
	if !isEquivalentTrueFalseAnswer("statement-1:true", "true") {
		t.Fatal("expected id:true to match true key")
	}

	if !isEquivalentTrueFalseAnswer("statement-1:false", "false") {
		t.Fatal("expected id:false to match false key")
	}

	if isEquivalentTrueFalseAnswer("statement-1:true|statement-2:false", "true") {
		t.Fatal("expected conflicting boolean tokens to be rejected")
	}
}

func TestCalculateScore_TrueFalseSetAndBoolean(t *testing.T) {
	service := &scoreService{}

	keys := &models.AnswerKeys{
		PilihanGandaAnswers: map[string]map[string]struct {
			IsCorrect   bool
			Bobot       int
			TextPilihan string
		}{},
		TrueFalseAnswers: map[string]struct {
			Jawaban     string
			Bobot       int
			TextPilihan string
		}{
			"soal-tf-set": {Jawaban: "tf-1|tf-3", Bobot: 10},
			"soal-tf-bool": {
				Jawaban: "true",
				Bobot:   15,
			},
		},
		UraianAnswers: map[string]struct {
			Jawaban string
			Bobot   int
		}{},
	}

	answers := []models.UserAnswer{
		{KodeSoal: "soal-tf-set", Jawaban: "tf-3,tf-1"},
		{KodeSoal: "soal-tf-bool", Jawaban: "benar"},
	}

	got := service.CalculateScore(answers, keys)
	if got != 25 {
		t.Fatalf("expected score 25, got %.2f", got)
	}
}

func TestCalculateMaxSubtestScore(t *testing.T) {
	keys := &models.AnswerKeys{
		PilihanGandaAnswers: map[string]map[string]struct {
			IsCorrect   bool
			Bobot       int
			TextPilihan string
		}{
			"q-pg": {
				"a": {IsCorrect: false, Bobot: 33},
				"b": {IsCorrect: true, Bobot: 33},
			},
		},
		TrueFalseAnswers: map[string]struct {
			Jawaban     string
			Bobot       int
			TextPilihan string
		}{
			"q-tf": {Jawaban: "true", Bobot: 20},
		},
		UraianAnswers: map[string]struct {
			Jawaban string
			Bobot   int
		}{
			"q-ur": {Jawaban: "x", Bobot: 15},
		},
	}

	maxScore := calculateMaxSubtestScore(keys)
	if maxScore != 68 {
		t.Fatalf("expected max score 68, got %.2f", maxScore)
	}
}

func TestNormalizeSubtestScore_CappedAndScaled(t *testing.T) {
	got := normalizeSubtestScore(1089, 1122)
	if got <= 0 || got > 1000 {
		t.Fatalf("expected normalized score in range (0,1000], got %.2f", got)
	}

	if got != 970.59 {
		t.Fatalf("expected normalized score 970.59, got %.2f", got)
	}

	if capped := normalizeSubtestScore(1200, 1000); capped != 1000 {
		t.Fatalf("expected capped score 1000, got %.2f", capped)
	}
}

func TestCalculateScore_MultipleChoicePartialCredit(t *testing.T) {
	service := &scoreService{}

	keys := &models.AnswerKeys{
		PilihanGandaAnswers: map[string]map[string]struct {
			IsCorrect   bool
			Bobot       int
			TextPilihan string
		}{
			"soal-pg": {
				"opt-a": {IsCorrect: true, Bobot: 10},
				"opt-b": {IsCorrect: true, Bobot: 10},
				"opt-c": {IsCorrect: false, Bobot: 10},
			},
		},
		TrueFalseAnswers: map[string]struct {
			Jawaban     string
			Bobot       int
			TextPilihan string
		}{},
		UraianAnswers: map[string]struct {
			Jawaban string
			Bobot   int
		}{},
	}

	partial := service.CalculateScore([]models.UserAnswer{{KodeSoal: "soal-pg", Jawaban: "opt-a"}}, keys)
	if partial != 5 {
		t.Fatalf("expected partial score 5, got %.2f", partial)
	}

	withWrong := service.CalculateScore([]models.UserAnswer{{KodeSoal: "soal-pg", Jawaban: "opt-a,opt-c"}}, keys)
	if withWrong != 0 {
		t.Fatalf("expected score 0 when selecting wrong option, got %.2f", withWrong)
	}
}

func TestCalculateScore_TrueFalseSetPartialCredit(t *testing.T) {
	service := &scoreService{}

	keys := &models.AnswerKeys{
		PilihanGandaAnswers: map[string]map[string]struct {
			IsCorrect   bool
			Bobot       int
			TextPilihan string
		}{},
		TrueFalseAnswers: map[string]struct {
			Jawaban     string
			Bobot       int
			TextPilihan string
		}{
			"soal-tf": {Jawaban: "tf-1|tf-2|tf-3", Bobot: 9},
		},
		UraianAnswers: map[string]struct {
			Jawaban string
			Bobot   int
		}{},
	}

	partial := service.CalculateScore([]models.UserAnswer{{KodeSoal: "soal-tf", Jawaban: "tf-1,tf-2"}}, keys)
	if partial != 6 {
		t.Fatalf("expected partial score 6, got %.2f", partial)
	}

	withWrong := service.CalculateScore([]models.UserAnswer{{KodeSoal: "soal-tf", Jawaban: "tf-1,tf-x"}}, keys)
	if withWrong != 0 {
		t.Fatalf("expected score 0 for wrong true-false set token, got %.2f", withWrong)
	}
}
