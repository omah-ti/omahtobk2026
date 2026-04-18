CREATE TABLE IF NOT EXISTS tryout_attempt (
    attempt_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    username VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    paket VARCHAR(36) NOT NULL,
    status VARCHAR(36) DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'finished')),
    end_time TIMESTAMP,
    tryout_score DOUBLE PRECISION DEFAULT NULL,
    subtest_sekarang VARCHAR(36) CHECK (subtest_sekarang IN ('subtest_pu', 'subtest_ppu', 'subtest_pbm', 'subtest_pk', 'subtest_lbi', 'subtest_lbe', 'subtest_pm')),
    UNIQUE(user_id, paket)
);

CREATE TABLE IF NOT EXISTS user_answers (
    attempt_id INT NOT NULL,
    subtest VARCHAR(36) NOT NULL,
    kode_soal VARCHAR(36) NOT NULL,
    jawaban TEXT NOT NULL,
    PRIMARY KEY(attempt_id, subtest, kode_soal),
    FOREIGN KEY (attempt_id) REFERENCES tryout_attempt(attempt_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_scores (
    user_id INT NOT NULL,
    attempt_id INT NOT NULL,
    subtest VARCHAR(36) NOT NULL,
    score DOUBLE PRECISION NOT NULL,
    PRIMARY KEY(user_id, attempt_id, subtest),
    FOREIGN KEY (attempt_id) REFERENCES tryout_attempt(attempt_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS time_limit (
    time_limit_id SERIAL PRIMARY KEY,
    attempt_id INT NOT NULL,
    subtest VARCHAR(36) NOT NULL,
    time_limit TIMESTAMP NOT NULL,
    FOREIGN KEY (attempt_id) REFERENCES tryout_attempt(attempt_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_time_limit_attempt_subtest
    ON time_limit (attempt_id, subtest);