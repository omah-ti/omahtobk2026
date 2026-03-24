CREATE TABLE IF NOT EXISTS users(
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    nama_user VARCHAR(255) NOT NULL,
    asal_sekolah VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    reset_token VARCHAR(255),
    reset_token_expired_at TIMESTAMP,
    password VARCHAR(255) NOT NUll
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';
UPDATE users SET role = 'user' WHERE role IS NULL OR BTRIM(role) = '';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_role_check'
    ) THEN
        ALTER TABLE users
        ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'user'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS refresh_tokens (
    refresh_token_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    refresh_token_value VARCHAR(255) NOT NULL,
    expired_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_refresh_token_value ON refresh_tokens(refresh_token_value);