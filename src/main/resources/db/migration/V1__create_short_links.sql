CREATE TABLE IF NOT EXISTS short_links (
 id UUID PRIMARY KEY,
 code VARCHAR(32) NOT NULL UNIQUE,
 destination_url VARCHAR(4096) NOT NULL,
 title VARCHAR(120),
 manage_token_hash VARCHAR(64) NOT NULL,
 click_count BIGINT NOT NULL DEFAULT 0,
 last_clicked_at TIMESTAMPTZ,
 expires_at TIMESTAMPTZ,
 is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_short_links_code ON short_links(code);
