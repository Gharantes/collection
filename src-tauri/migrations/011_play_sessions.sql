-- Sessões de jogo abertas pelo app (executável), com início e duração.
CREATE TABLE IF NOT EXISTS play_sessions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id    INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    started_at TEXT    NOT NULL,
    seconds    INTEGER NOT NULL CHECK (seconds >= 0)
);
