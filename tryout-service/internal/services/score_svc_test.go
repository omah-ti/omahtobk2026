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
