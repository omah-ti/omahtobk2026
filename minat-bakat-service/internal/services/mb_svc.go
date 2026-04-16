package services

import (
	"context"
	"errors"
	"fmt"
	"minat-bakat-service/internal/logger"
	"minat-bakat-service/internal/models"
	"minat-bakat-service/internal/repositories"
	"strings"
)

type MinatBakatService interface {
	GetQuestions(c context.Context) ([]models.MbQuestion, error)
	ProcessMinatBakatAnswers(c context.Context, userID int, req models.SubmitMinatBakatRequest) (*models.MinatBakatResult, error)
	GetMinatBakatAttempt(c context.Context, userID int) (*models.MinatBakatAttempt, error)
	GetMinatBakatAttemptHistory(c context.Context, userID, limit, offset int) (*models.MinatBakatAttemptHistory, error)
	GetLatestResult(c context.Context, userID int) (*models.MinatBakatResult, error)
}

type minatBakatService struct {
	minatBakatRepo repositories.MbRepo
}

func NewMinatBakatService(minatBakatRepo repositories.MbRepo) MinatBakatService {
	return &minatBakatService{minatBakatRepo: minatBakatRepo}
}

const (
	defaultAssessmentVersion = "dna-it-v1"
	defaultScoringVersion    = "scoring-v4"
)

type roleDefinition struct {
	Slug              string
	Title             string
	FirstDescription  string
	SecondDescription string
	Weights           map[string]float64
}

var roleDefinitions = []roleDefinition{
	{
		Slug:              "backend",
		Title:             "BACK END",
		FirstDescription:  "Back End Developer bertanggung jawab membangun logika sisi server dan arsitektur basis data yang kokoh. Fokus utamamu adalah merancang API yang efisien, mengelola sistem manajemen data yang aman, serta memastikan stabilitas infrastruktur agar aplikasi dapat berjalan tanpa hambatan.",
		SecondDescription: "Kamu berperan penting dalam menjaga mesin penggerak utama di balik layar tetap beroperasi. Dengan menguasai bahasa pemrograman server dan optimasi kueri basis data, kamu memastikan sistem tidak hanya aman dari ancaman tetapi juga mampu menangani lonjakan pengguna dengan baik bagi semua orang.",
		Weights: map[string]float64{
			"analytical":    0.30,
			"detail":        0.20,
			"system":        0.30,
			"security":      0.15,
			"creative":      0.03,
			"communication": 0.02,
		},
	},
	{
		Slug:              "frontend",
		Title:             "FRONT END",
		FirstDescription:  "Front End Developer bertanggung jawab membangun antarmuka digital yang interaktif dan responsif menggunakan HTML, CSS, dan JavaScript. Fokus utamamu adalah mengubah desain visual menjadi kode nyata yang fungsional, memastikan setiap elemen UI berjalan mulus di berbagai perangkat, serta mengoptimalkan kecepatan akses demi pengalaman pengguna yang maksimal.",
		SecondDescription: "Kamu berperan penting dalam menjembatani sisi estetika desain dengan logika pemrograman. Dengan menguasai struktur kode yang bersih dan integrasi data yang efisien, kamu memastikan aplikasi tidak hanya terlihat menarik tetapi juga memiliki performa tinggi dan aksesibilitas yang baik bagi semua orang.",
		Weights: map[string]float64{
			"creative":      0.32,
			"system":        0.24,
			"communication": 0.20,
			"detail":        0.14,
			"analytical":    0.08,
			"security":      0.02,
		},
	},
	{
		Slug:              "uiux",
		Title:             "UI/UX DESIGNER",
		FirstDescription:  "UI/UX Designer bertanggung jawab merancang antarmuka visual yang estetis sekaligus menciptakan alur pengalaman pengguna yang intuitif. Fokus utamamu adalah melakukan riset kebutuhan audiens, menyusun wireframe interaktif, serta membuat prototipe desain yang fungsional di berbagai ukuran layar.",
		SecondDescription: "Kamu berperan penting dalam menghubungkan empati pengguna dengan solusi produk digital. Dengan menguasai prinsip desain empati dan tipografi yang harmonis, kamu memastikan aplikasi tidak hanya indah dipandang tetapi juga sangat mudah digunakan dan dinavigasi bagi semua orang.",
		Weights: map[string]float64{
			"creative":      0.36,
			"communication": 0.28,
			"detail":        0.14,
			"system":        0.12,
			"analytical":    0.08,
			"security":      0.02,
		},
	},
	{
		Slug:              "cysec",
		Title:             "CYBER SECURITY",
		FirstDescription:  "Cyber Security Analyst bertanggung jawab melindungi sistem jaringan dan data sensitif dari berbagai ancaman digital. Fokus utamamu adalah memantau aktivitas mencurigakan, melakukan pengujian kerentanan sistem, serta merancang protokol keamanan berlapis untuk mencegah kebocoran informasi.",
		SecondDescription: "Kamu berperan penting dalam membangun benteng pertahanan utama untuk ekosistem digital. Dengan menguasai teknik enkripsi data dan analisis forensik jaringan, kamu memastikan privasi pengguna tetap terjaga dan platform beroperasi dengan tingkat kepercayaan yang tinggi bagi semua orang.",
		Weights: map[string]float64{
			"security":      0.45,
			"analytical":    0.22,
			"detail":        0.18,
			"system":        0.10,
			"communication": 0.03,
			"creative":      0.02,
		},
	},
	{
		Slug:              "data-scientist",
		Title:             "DATA SCIENTIST",
		FirstDescription:  "Data Scientist bertanggung jawab mengolah kumpulan data mentah menjadi wawasan bisnis yang berharga dan dapat ditindaklanjuti. Fokus utamamu adalah merancang model prediktif, membersihkan anomali data, serta memvisualisasikan tren kompleks menjadi informasi yang mudah dipahami oleh tim.",
		SecondDescription: "Kamu berperan penting dalam mengarahkan strategi produk berdasarkan fakta dan angka nyata. Dengan menguasai algoritma machine learning dan bahasa pemrograman analitik, kamu memastikan keputusan bisnis tidak lagi berdasarkan tebakan tetapi didukung oleh akurasi data bagi semua orang.",
		Weights: map[string]float64{
			"analytical":    0.40,
			"detail":        0.22,
			"system":        0.18,
			"communication": 0.10,
			"creative":      0.08,
			"security":      0.02,
		},
	},
	{
		Slug:              "dsai",
		Title:             "DSAI",
		FirstDescription:  "AI Engineer bertanggung jawab merancang dan melatih model kecerdasan buatan untuk mengotomatisasi sistem yang kompleks. Fokus utamamu adalah membangun jaringan saraf tiruan, mengimplementasikan pemrosesan bahasa alami, serta mengoptimalkan algoritma agar mesin dapat belajar secara mandiri.",
		SecondDescription: "Kamu berperan penting dalam membawa inovasi masa depan ke dalam produk digital masa kini. Dengan menguasai logika matematika lanjutan dan arsitektur model komputasi, kamu memastikan teknologi tidak hanya menjadi alat pasif tetapi juga asisten cerdas yang proaktif bagi semua orang.",
		Weights: map[string]float64{
			"analytical":    0.38,
			"creative":      0.24,
			"system":        0.18,
			"detail":        0.12,
			"communication": 0.05,
			"security":      0.03,
		},
	},
	{
		Slug:              "mobapps",
		Title:             "MOBILE DEVELOPMENT",
		FirstDescription:  "Mobile Developer bertanggung jawab merancang dan membangun aplikasi ponsel pintar yang berjalan mulus di sistem operasi iOS maupun Android. Fokus utamamu adalah menyusun kode yang efisien, mengintegrasikan fitur perangkat keras seperti kamera, serta memastikan konsistensi antarmuka di berbagai ukuran gawai.",
		SecondDescription: "Kamu berperan penting dalam membawa teknologi agar selalu berada dalam genggaman pengguna. Dengan menguasai kerangka kerja aplikasi seluler dan manajemen memori yang baik, kamu memastikan aplikasi tidak hanya kaya fitur tetapi juga hemat baterai dan responsif bagi semua orang.",
		Weights: map[string]float64{
			"system":        0.30,
			"detail":        0.20,
			"creative":      0.20,
			"analytical":    0.14,
			"communication": 0.10,
			"security":      0.06,
		},
	},
	{
		Slug:              "cloud-engineer",
		Title:             "CLOUD ENGINEER",
		FirstDescription:  "Cloud Engineer bertanggung jawab menjembatani proses pengembangan perangkat lunak dengan operasi IT melalui sistem otomatisasi komputasi awan. Fokus utamamu adalah merancang alur integrasi berkelanjutan, mengelola server virtual, serta memantau kesehatan infrastruktur agar selalu tersedia setiap saat.",
		SecondDescription: "Kamu berperan penting dalam mempercepat siklus peluncuran fitur baru ke tangan pengguna. Dengan menguasai arsitektur sistem terdistribusi dan manajemen kontainer aplikasi, kamu memastikan platform tidak hanya stabil saat pembaruan tetapi juga skalabel dan andal bagi semua orang.",
		Weights: map[string]float64{
			"system":        0.34,
			"security":      0.20,
			"analytical":    0.20,
			"detail":        0.16,
			"communication": 0.08,
			"creative":      0.02,
		},
	},
	{
		Slug:              "gamedev",
		Title:             "GAME DEVELOPMENT",
		FirstDescription:  "Game Developer bertanggung jawab mengubah baris kode dan aset visual menjadi pengalaman interaktif yang imersif dan hidup. Fokus utamamu adalah merancang logika permainan yang kompleks, mengoptimalkan mekanik gameplay, serta memastikan performa aplikasi tetap lancar di berbagai perangkat melalui penguasaan game engine.",
		SecondDescription: "Kamu berperan penting dalam menghidupkan visi kreatif ke dalam dunia digital yang dapat dimainkan. Dengan menguasai arsitektur sistem real-time dan integrasi aset multimedia, kamu memastikan bahwa setiap interaksi terasa responsif, duniamu bebas dari kendala teknis, serta setiap pembaruan konten memberikan petualangan yang tak terlupakan bagi para pemain.",
		Weights: map[string]float64{
			"creative":      0.34,
			"system":        0.24,
			"analytical":    0.18,
			"detail":        0.12,
			"communication": 0.08,
			"security":      0.04,
		},
	},
}

var roleBySlug = map[string]roleDefinition{}

var roleAliasToSlug = map[string]string{}

func init() {
	for _, def := range roleDefinitions {
		roleBySlug[def.Slug] = def
		roleAliasToSlug[normalizeRoleKey(def.Slug)] = def.Slug
		roleAliasToSlug[normalizeRoleKey(def.Title)] = def.Slug
	}
}

func normalizeRoleKey(raw string) string {
	normalized := strings.ToLower(strings.TrimSpace(raw))
	replacer := strings.NewReplacer("-", " ", "_", " ", "/", " ", "&", " and ")
	normalized = replacer.Replace(normalized)
	return strings.Join(strings.Fields(normalized), " ")
}

func resolveRoleDefinition(raw string) (roleDefinition, bool) {
	normalized := normalizeRoleKey(raw)
	if normalized == "" {
		return roleDefinition{}, false
	}

	if role, ok := roleBySlug[normalized]; ok {
		return role, true
	}

	if slug, ok := roleAliasToSlug[normalized]; ok {
		role, exists := roleBySlug[slug]
		if exists {
			return role, true
		}
	}

	switch {
	case strings.Contains(normalized, "back"):
		return roleBySlug["backend"], true
	case strings.Contains(normalized, "front"):
		return roleBySlug["frontend"], true
	case strings.Contains(normalized, "ui") || strings.Contains(normalized, "ux"):
		return roleBySlug["uiux"], true
	case strings.Contains(normalized, "cyber") || strings.Contains(normalized, "security"):
		return roleBySlug["cysec"], true
	case strings.Contains(normalized, "machine learning") || strings.Contains(normalized, "artificial") || strings.Contains(normalized, "ai"):
		return roleBySlug["dsai"], true
	case strings.Contains(normalized, "data"):
		return roleBySlug["data-scientist"], true
	case strings.Contains(normalized, "mobile"):
		return roleBySlug["mobapps"], true
	case strings.Contains(normalized, "cloud") || strings.Contains(normalized, "devops"):
		return roleBySlug["cloud-engineer"], true
	case strings.Contains(normalized, "game"):
		return roleBySlug["gamedev"], true
	default:
		return roleDefinition{}, false
	}
}

func toRoleProfile(role roleDefinition) models.MinatBakatRoleProfile {
	return models.MinatBakatRoleProfile{
		Slug:              role.Slug,
		Title:             role.Title,
		FirstDescription:  role.FirstDescription,
		SecondDescription: role.SecondDescription,
	}
}

func enrichRoleProfile(result *models.MinatBakatResult) *models.MinatBakatResult {
	if result == nil {
		return nil
	}

	candidates := []string{result.TopRoleSlug, result.TopRoleTitle, result.DNATop}
	for _, candidate := range candidates {
		role, ok := resolveRoleDefinition(candidate)
		if !ok {
			continue
		}

		result.TopRoleSlug = role.Slug
		result.TopRoleTitle = role.Title
		result.TopRoleProfile = toRoleProfile(role)
		if strings.TrimSpace(result.DNATop) == "" {
			result.DNATop = role.Title
		}
		return result
	}

	if strings.TrimSpace(result.TopRoleTitle) == "" {
		result.TopRoleTitle = result.DNATop
	}

	return result
}

func (s *minatBakatService) GetQuestions(c context.Context) ([]models.MbQuestion, error) {
	questions, err := s.minatBakatRepo.GetActiveQuestions(c)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get MB questions")
		return nil, err
	}

	return questions, nil
}

func (s *minatBakatService) ProcessMinatBakatAnswers(c context.Context, userID int, req models.SubmitMinatBakatRequest) (*models.MinatBakatResult, error) {
	if len(req.Answers) == 0 {
		return nil, errors.New("answers cannot be empty")
	}

	assessmentVersion := req.AssessmentVersion
	if strings.TrimSpace(assessmentVersion) == "" {
		assessmentVersion = defaultAssessmentVersion
	}

	questions, err := s.minatBakatRepo.GetActiveQuestions(c)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to load MB questions")
		return nil, err
	}
	if len(questions) == 0 {
		return nil, errors.New("no active questions configured")
	}

	questionByID := make(map[int]models.MbQuestion, len(questions))
	questionByCode := make(map[string]models.MbQuestion, len(questions))
	for _, question := range questions {
		questionByID[question.QuestionID] = question
		questionByCode[question.KodeSoal] = question
	}

	seenQuestionID := make(map[int]struct{}, len(req.Answers))
	dimTotals := make(map[string]float64)
	dimCounts := make(map[string]float64)

	for _, answer := range req.Answers {
		if answer.LikertValue < 1 || answer.LikertValue > 5 {
			return nil, fmt.Errorf("likert_value must be between 1 and 5")
		}

		var q models.MbQuestion
		if answer.QuestionID != nil {
			question, ok := questionByID[*answer.QuestionID]
			if !ok {
				return nil, fmt.Errorf("invalid question_id %d", *answer.QuestionID)
			}
			q = question
		} else {
			question, ok := questionByCode[answer.KodeSoal]
			if !ok {
				return nil, fmt.Errorf("invalid kode_soal %s", answer.KodeSoal)
			}
			q = question
		}

		if _, exists := seenQuestionID[q.QuestionID]; exists {
			return nil, fmt.Errorf("duplicate answer for question_id %d", q.QuestionID)
		}
		seenQuestionID[q.QuestionID] = struct{}{}

		scored := answer.LikertValue
		if q.ReverseScored {
			scored = 6 - answer.LikertValue
		}

		dimTotals[q.Dimension] += float64(scored)
		dimCounts[q.Dimension] += 1
	}

	if len(seenQuestionID) != len(questions) {
		return nil, fmt.Errorf("incomplete submission: expected %d answers, got %d", len(questions), len(seenQuestionID))
	}

	dimensionScores := make(map[string]float64, len(dimTotals))
	for dim, total := range dimTotals {
		count := dimCounts[dim]
		if count == 0 {
			continue
		}
		dimensionScores[dim] = total / count
	}

	roleScores := make(map[string]float64, len(roleDefinitions))
	var (
		topRoleDef *roleDefinition
		topScore   float64
		totalAll   float64
	)

	for _, role := range roleDefinitions {
		var score float64
		for dim, weight := range role.Weights {
			score += dimensionScores[dim] * weight
		}
		roleScores[role.Title] = score
		totalAll += score
		if score > topScore || topRoleDef == nil {
			topScore = score
			candidate := role
			topRoleDef = &candidate
		}
	}

	if topRoleDef == nil {
		return nil, errors.New("failed to determine top role")
	}

	confidence := 0.0
	if totalAll > 0 {
		confidence = (topScore / totalAll) * 100
	}

	tx, err := s.minatBakatRepo.BeginTransaction(c)
	if err != nil {
		return nil, err
	}
	committed := false
	defer func() {
		if committed {
			return
		}
		if rbErr := tx.Rollback(); rbErr != nil {
			logger.LogErrorCtx(c, rbErr, "Failed to rollback MB transaction")
		}
	}()

	attemptID, err := s.minatBakatRepo.CreateAttemptTx(c, tx, userID, assessmentVersion, defaultScoringVersion)
	if err != nil {
		return nil, err
	}

	if err := s.minatBakatRepo.SaveAttemptAnswersTx(c, tx, attemptID, req.Answers, questionByID, questionByCode); err != nil {
		return nil, err
	}

	result := &models.MinatBakatResult{
		AttemptID:         attemptID,
		UserID:            userID,
		DNATop:            topRoleDef.Title,
		TopRoleSlug:       topRoleDef.Slug,
		TopRoleTitle:      topRoleDef.Title,
		TopRoleProfile:    toRoleProfile(*topRoleDef),
		Confidence:        confidence,
		TotalQuestions:    len(questions),
		AssessmentVersion: assessmentVersion,
		ScoringVersion:    defaultScoringVersion,
		DimensionScores:   dimensionScores,
		RoleScores:        roleScores,
	}

	if err := s.minatBakatRepo.SaveResultTx(c, tx, result); err != nil {
		return nil, err
	}

	if err := s.minatBakatRepo.InsertAttemptHistoryTx(c, tx, userID, topRoleDef.Slug); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		logger.LogErrorCtx(c, err, "Failed to commit MB transaction", map[string]interface{}{"user_id": userID})
		return nil, err
	}
	committed = true

	return result, nil
}

func (s *minatBakatService) GetMinatBakatAttempt(c context.Context, userID int) (*models.MinatBakatAttempt, error) {
	attempt, err := s.minatBakatRepo.GetMinatBakatFromUserID(c, userID)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get minat bakat attempt", map[string]interface{}{"user_id": userID})
		return nil, err
	}

	if attempt != nil {
		if role, ok := resolveRoleDefinition(attempt.BakatUser); ok {
			attempt.BakatUser = role.Slug
		}
	}

	return attempt, nil
}

func (s *minatBakatService) GetMinatBakatAttemptHistory(c context.Context, userID, limit, offset int) (*models.MinatBakatAttemptHistory, error) {
	items, err := s.minatBakatRepo.GetMinatBakatHistoryByUserID(c, userID, limit, offset)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get minat bakat attempt history", map[string]interface{}{"user_id": userID, "limit": limit, "offset": offset})
		return nil, err
	}

	for i := range items {
		if role, ok := resolveRoleDefinition(items[i].BakatUser); ok {
			items[i].BakatUser = role.Slug
		}
	}

	return &models.MinatBakatAttemptHistory{
		Items:  items,
		Limit:  limit,
		Offset: offset,
		Count:  len(items),
	}, nil
}

func (s *minatBakatService) GetLatestResult(c context.Context, userID int) (*models.MinatBakatResult, error) {
	result, err := s.minatBakatRepo.GetLatestResultByUserID(c, userID)
	if err != nil {
		logger.LogErrorCtx(c, err, "Failed to get latest MB result", map[string]interface{}{"user_id": userID})
		return nil, err
	}

	return enrichRoleProfile(result), nil
}
