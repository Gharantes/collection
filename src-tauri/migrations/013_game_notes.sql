-- Várias anotações por jogo; a anotação antiga de games.notes vira a primeira.
CREATE TABLE IF NOT EXISTS game_notes (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    title   TEXT    NOT NULL,
    body    TEXT    NOT NULL DEFAULT ''
);
INSERT INTO game_notes (game_id, title, body)
SELECT id, 'Anotações', notes FROM games WHERE notes IS NOT NULL AND notes <> '';
UPDATE games SET notes = NULL;
