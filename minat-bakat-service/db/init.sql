CREATE TABLE IF NOT EXISTS minat_bakat_attempt (
    user_id INT PRIMARY KEY,
    bakat_user VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS mb_questions (
    question_id SERIAL PRIMARY KEY,
    kode_soal VARCHAR(36) NOT NULL UNIQUE,
    statement TEXT NOT NULL,
    dimension VARCHAR(50) NOT NULL,
    reverse_scored BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mb_attempts (
    attempt_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    assessment_version VARCHAR(36) NOT NULL DEFAULT 'dna-it-v1',
    scoring_version VARCHAR(36) NOT NULL DEFAULT 'scoring-v1',
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mb_attempt_answers (
    attempt_id INT NOT NULL,
    question_id INT NOT NULL,
    likert_value SMALLINT NOT NULL CHECK (likert_value BETWEEN 1 AND 5),
    scored_value SMALLINT NOT NULL CHECK (scored_value BETWEEN 1 AND 5),
    PRIMARY KEY (attempt_id, question_id),
    FOREIGN KEY (attempt_id) REFERENCES mb_attempts(attempt_id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES mb_questions(question_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mb_results (
    result_id SERIAL PRIMARY KEY,
    attempt_id INT NOT NULL UNIQUE,
    user_id INT NOT NULL,
    dna_it_top VARCHAR(50) NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    total_questions INT NOT NULL,
    assessment_version VARCHAR(36) NOT NULL,
    scoring_version VARCHAR(36) NOT NULL,
    dimension_scores JSONB NOT NULL,
    role_scores JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (attempt_id) REFERENCES mb_attempts(attempt_id) ON DELETE CASCADE
);

INSERT INTO mb_questions (kode_soal, statement, dimension, reverse_scored, is_active)
VALUES
    ('MBQ001', 'Saya menikmati memecahkan masalah teknis yang kompleks.', 'analytical', FALSE, TRUE),
    ('MBQ002', 'Saya lebih suka pekerjaan yang menuntut ketelitian tinggi.', 'detail', FALSE, TRUE),
    ('MBQ003', 'Saya merasa puas ketika berhasil mempercepat alur kerja tim.', 'system', FALSE, TRUE),
    ('MBQ004', 'Saya tertarik mempelajari celah keamanan pada aplikasi.', 'security', FALSE, TRUE),
    ('MBQ005', 'Saya nyaman menjelaskan ide teknis kepada orang non-teknis.', 'communication', FALSE, TRUE),
    ('MBQ006', 'Saya menikmati merancang tampilan antarmuka yang menarik.', 'creative', FALSE, TRUE),
    ('MBQ007', 'Saya sering memikirkan cara meningkatkan reliability sistem.', 'system', FALSE, TRUE),
    ('MBQ008', 'Saya kurang suka mengerjakan debugging yang mendalam.', 'analytical', TRUE, TRUE),
    ('MBQ009', 'Saya teliti membaca log atau detail kecil saat investigasi.', 'detail', FALSE, TRUE),
    ('MBQ010', 'Saya tertarik membuat workflow CI/CD yang efisien.', 'system', FALSE, TRUE),
    ('MBQ011', 'Saya tertarik mengamankan data dan akses pengguna.', 'security', FALSE, TRUE),
    ('MBQ012', 'Saya lebih suka bekerja sendiri daripada kolaborasi lintas tim.', 'communication', TRUE, TRUE),
    ('MBQ013', 'Saya suka mengeksplorasi banyak alternatif solusi desain.', 'creative', FALSE, TRUE),
    ('MBQ014', 'Saya menikmati mengubah requirement menjadi langkah terstruktur.', 'analytical', FALSE, TRUE),
    ('MBQ015', 'Saya sering menyusun checklist untuk memastikan kualitas.', 'detail', FALSE, TRUE),
    ('MBQ016', 'Saya suka menganalisis dampak keputusan produk ke user.', 'communication', FALSE, TRUE)
ON CONFLICT (kode_soal) DO NOTHING;