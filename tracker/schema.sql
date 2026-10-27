-- The tracker's tables. Safe to run again: everything is IF NOT EXISTS.

-- Numbered things, bumped atomically with UPDATE ... RETURNING
CREATE TABLE IF NOT EXISTS counters (
    name TEXT PRIMARY KEY,
    value INTEGER NOT NULL
);
INSERT OR IGNORE INTO counters (name, value) VALUES ('visitors', 0);

-- One row per browser, by the random id it keeps in localStorage
CREATE TABLE IF NOT EXISTS visitors (
    vid TEXT PRIMARY KEY,
    n INTEGER NOT NULL, -- visitor number: the nth browser to come by
    visits INTEGER NOT NULL,
    first_seen INTEGER NOT NULL -- ms since epoch
);

-- One row per visit (a browser tab's session). No IP addresses: those go to
-- the Discord post only, which is read back from Discord when it is edited.
CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    vid TEXT NOT NULL,
    started INTEGER NOT NULL,
    updated INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    message_id TEXT, -- the Discord post, edited as the visit goes on
    events TEXT, -- pages and clicks, JSON
    country TEXT,
    region TEXT,
    city TEXT,
    network TEXT,
    device TEXT,
    browser TEXT,
    os TEXT,
    lang TEXT,
    referrer TEXT,
    entry TEXT
);
CREATE INDEX IF NOT EXISTS sessions_started ON sessions (started);
