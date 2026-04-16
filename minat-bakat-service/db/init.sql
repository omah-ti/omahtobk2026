CREATE TABLE IF NOT EXISTS minat_bakat_attempt (
    user_id INT PRIMARY KEY,
    bakat_user VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS minat_bakat_attempt_history (
    attempt_id BIGSERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    bakat_user VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mb_attempt_history_user_created
ON minat_bakat_attempt_history (user_id, created_at DESC, attempt_id DESC);

INSERT INTO minat_bakat_attempt_history (user_id, bakat_user, created_at)
SELECT legacy.user_id, legacy.bakat_user, NOW()
FROM minat_bakat_attempt legacy
WHERE NOT EXISTS (
    SELECT 1
    FROM minat_bakat_attempt_history hist
    WHERE hist.user_id = legacy.user_id
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
    scoring_version VARCHAR(36) NOT NULL DEFAULT 'scoring-v4',
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP
);

ALTER TABLE mb_attempts
    ALTER COLUMN scoring_version SET DEFAULT 'scoring-v4';

UPDATE mb_attempts
SET scoring_version = 'scoring-v4'
WHERE scoring_version IS NULL OR scoring_version = '' OR scoring_version = 'scoring-v3';

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

CREATE INDEX IF NOT EXISTS idx_mb_results_user_created
ON mb_results (user_id, created_at DESC, result_id DESC);

UPDATE minat_bakat_attempt_history
SET bakat_user = CASE
    WHEN LOWER(TRIM(bakat_user)) IN ('backend', 'back end', 'back-end', 'back end developer', 'backend engineer') THEN 'backend'
    WHEN LOWER(TRIM(bakat_user)) IN ('frontend', 'front end', 'front-end', 'fron end', 'front end developer', 'developer advocate / tech consultant') THEN 'frontend'
    WHEN LOWER(TRIM(bakat_user)) IN ('ui/ux designer', 'ui ux designer', 'uiux', 'ui/ux designer or front-end engineer') THEN 'uiux'
    WHEN LOWER(TRIM(bakat_user)) IN ('cyber security', 'cysec', 'security analyst') THEN 'cysec'
    WHEN LOWER(TRIM(bakat_user)) IN ('ct', 'data scientist', 'data engineer / big data architect', 'data engineer', 'big data architect') THEN 'data-scientist'
    WHEN LOWER(TRIM(bakat_user)) IN ('dsai', 'ai engineer', 'ai & machine learning engineer', 'machine learning engineer') THEN 'dsai'
    WHEN LOWER(TRIM(bakat_user)) IN ('mobile development', 'mobile developer', 'mobapps', 'mobile apps') THEN 'mobapps'
    WHEN LOWER(TRIM(bakat_user)) IN ('cloud engineer', 'devops', 'devops engineer', 'product manager / tech leadership') THEN 'cloud-engineer'
    WHEN LOWER(TRIM(bakat_user)) IN ('game development', 'game developer', 'gamedev') THEN 'gamedev'
    ELSE bakat_user
END;

UPDATE mb_results
SET dna_it_top = CASE
    WHEN LOWER(TRIM(dna_it_top)) IN ('backend', 'back end', 'back-end', 'back end developer', 'backend engineer') THEN 'BACK END'
    WHEN LOWER(TRIM(dna_it_top)) IN ('frontend', 'front end', 'front-end', 'fron end', 'front end developer', 'developer advocate / tech consultant') THEN 'FRONT END'
    WHEN LOWER(TRIM(dna_it_top)) IN ('ui/ux designer', 'ui ux designer', 'uiux', 'ui/ux designer or front-end engineer') THEN 'UI/UX DESIGNER'
    WHEN LOWER(TRIM(dna_it_top)) IN ('cyber security', 'cysec', 'security analyst') THEN 'CYBER SECURITY'
    WHEN LOWER(TRIM(dna_it_top)) IN ('ct', 'data scientist', 'data engineer / big data architect', 'data engineer', 'big data architect') THEN 'DATA SCIENTIST'
    WHEN LOWER(TRIM(dna_it_top)) IN ('dsai', 'ai engineer', 'ai & machine learning engineer', 'machine learning engineer') THEN 'DSAI'
    WHEN LOWER(TRIM(dna_it_top)) IN ('mobile development', 'mobile developer', 'mobapps', 'mobile apps') THEN 'MOBILE DEVELOPMENT'
    WHEN LOWER(TRIM(dna_it_top)) IN ('cloud engineer', 'devops', 'devops engineer', 'product manager / tech leadership') THEN 'CLOUD ENGINEER'
    WHEN LOWER(TRIM(dna_it_top)) IN ('game development', 'game developer', 'gamedev') THEN 'GAME DEVELOPMENT'
    ELSE dna_it_top
END;

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
    ('MBQ016', 'Saya suka menganalisis dampak keputusan produk ke user.', 'communication', FALSE, TRUE),
    ('MBQ017', 'Saya tertarik membandingkan beberapa pendekatan sebelum memilih solusi teknis terbaik.', 'analytical', FALSE, TRUE),
    ('MBQ018', 'Saya menikmati mengubah masalah kompleks menjadi langkah kecil yang jelas.', 'analytical', FALSE, TRUE),
    ('MBQ019', 'Saya nyaman membaca dokumentasi teknis yang panjang untuk memahami akar masalah.', 'analytical', FALSE, TRUE),
    ('MBQ020', 'Saya cenderung menebak solusi tanpa memeriksa penyebab masalah terlebih dahulu.', 'analytical', TRUE, TRUE),
    ('MBQ021', 'Saya tertantang menganalisis trade-off antara akurasi, biaya, dan kecepatan sistem.', 'analytical', FALSE, TRUE),
    ('MBQ022', 'Saya cepat menyerah saat menemukan bug yang tidak langsung terlihat penyebabnya.', 'analytical', TRUE, TRUE),
    ('MBQ023', 'Saya terbiasa memeriksa kembali hasil kerja sebelum dianggap selesai.', 'detail', FALSE, TRUE),
    ('MBQ024', 'Saya menikmati menemukan inkonsistensi kecil pada data atau konfigurasi.', 'detail', FALSE, TRUE),
    ('MBQ025', 'Saya teliti saat menulis nama variabel, parameter, atau struktur data.', 'detail', FALSE, TRUE),
    ('MBQ026', 'Menurut saya, dokumentasi detail tidak terlalu penting selama fitur berjalan.', 'detail', TRUE, TRUE),
    ('MBQ027', 'Saya sering melewatkan langkah verifikasi karena ingin cepat selesai.', 'detail', TRUE, TRUE),
    ('MBQ028', 'Saya suka merancang alur kerja end-to-end agar proses tim lebih efisien.', 'system', FALSE, TRUE),
    ('MBQ029', 'Saya tertarik memahami hubungan antar layanan dalam arsitektur aplikasi.', 'system', FALSE, TRUE),
    ('MBQ030', 'Saya menikmati membuat otomasi untuk tugas berulang di proses pengembangan.', 'system', FALSE, TRUE),
    ('MBQ031', 'Saya senang mengoptimalkan pipeline agar deployment lebih stabil.', 'system', FALSE, TRUE),
    ('MBQ032', 'Saya jarang memikirkan dampak perubahan kecil terhadap sistem secara keseluruhan.', 'system', TRUE, TRUE),
    ('MBQ033', 'Saya suka menyiapkan monitoring agar masalah bisa terdeteksi lebih cepat.', 'system', FALSE, TRUE),
    ('MBQ034', 'Saya peduli pada praktik penyimpanan kredensial yang aman.', 'security', FALSE, TRUE),
    ('MBQ035', 'Saya tertarik mempelajari celah keamanan sebelum sistem dipakai pengguna.', 'security', FALSE, TRUE),
    ('MBQ036', 'Saya terbiasa mempertimbangkan kontrol akses saat membuat fitur baru.', 'security', FALSE, TRUE),
    ('MBQ037', 'Menurut saya, pengujian keamanan bisa ditunda selama aplikasi sudah berjalan.', 'security', TRUE, TRUE),
    ('MBQ038', 'Saya nyaman meninjau potensi risiko saat integrasi dengan layanan pihak ketiga.', 'security', FALSE, TRUE),
    ('MBQ039', 'Saya jarang memperbarui dependensi karena khawatir mengganggu fitur yang ada.', 'security', TRUE, TRUE),
    ('MBQ040', 'Saya menikmati berdiskusi dengan tim lintas fungsi untuk menyamakan kebutuhan produk.', 'communication', FALSE, TRUE),
    ('MBQ041', 'Saya nyaman menjelaskan konsep teknis dengan bahasa sederhana.', 'communication', FALSE, TRUE),
    ('MBQ042', 'Saya aktif meminta dan memberi umpan balik agar kualitas kerja tim meningkat.', 'communication', FALSE, TRUE),
    ('MBQ043', 'Saya lebih memilih menghindari kolaborasi ketika proyek melibatkan banyak stakeholder.', 'communication', TRUE, TRUE),
    ('MBQ044', 'Saya merasa presentasi atau demo hasil kerja adalah beban yang sebaiknya dihindari.', 'communication', TRUE, TRUE),
    ('MBQ045', 'Saya senang mengeksplorasi ide baru untuk meningkatkan pengalaman pengguna.', 'creative', FALSE, TRUE),
    ('MBQ046', 'Saya menikmati menggabungkan estetika dan fungsi saat merancang solusi digital.', 'creative', FALSE, TRUE),
    ('MBQ047', 'Saya tertarik bereksperimen dengan pendekatan baru ketika solusi lama kurang efektif.', 'creative', FALSE, TRUE),
    ('MBQ048', 'Saya suka membuat prototipe cepat untuk menguji ide sebelum implementasi penuh.', 'creative', FALSE, TRUE),
    ('MBQ049', 'Saya jarang mencoba alternatif desain karena lebih nyaman mengikuti pola lama.', 'creative', TRUE, TRUE),
    ('MBQ050', 'Saya merasa inovasi tidak terlalu penting jika produk sudah berjalan normal.', 'creative', TRUE, TRUE),
    ('MBQ051', 'Saya menikmati merancang API yang konsisten, jelas, dan mudah dipelihara.', 'system', FALSE, TRUE),
    ('MBQ052', 'Saya tertarik mengoptimalkan query database agar layanan tetap responsif.', 'analytical', FALSE, TRUE),
    ('MBQ053', 'Saya terbiasa memikirkan validasi input dan error handling pada tiap endpoint.', 'detail', FALSE, TRUE),
    ('MBQ054', 'Saya peduli pada keamanan endpoint internal seperti autentikasi dan otorisasi.', 'security', FALSE, TRUE),
    ('MBQ055', 'Saya lebih tertarik mempercantik tampilan antarmuka daripada membangun logika server.', 'system', TRUE, TRUE),
    ('MBQ056', 'Saya jarang mempertimbangkan dampak perubahan skema data terhadap layanan lain.', 'analytical', TRUE, TRUE)
ON CONFLICT (kode_soal) DO NOTHING;