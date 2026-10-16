-- Cada mudança de status de um jogo, com a data (AAAA-MM-DD).
CREATE TABLE IF NOT EXISTS status_events (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    status  TEXT    NOT NULL CHECK (status IN ('backlog', 'playing', 'finished')),
    at      TEXT    NOT NULL
);
