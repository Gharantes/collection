-- Status registrados pelo usuário. Os jogos e o histórico deixam de ter CHECK fixo e passam a
-- referenciar a tabela: apagar um status tira o status dos jogos e apaga o histórico dele.
CREATE TABLE statuses (
    key   TEXT PRIMARY KEY,
    label TEXT NOT NULL UNIQUE
);
INSERT INTO statuses (key, label) VALUES
    ('backlog', 'Backlog'),
    ('playing', 'Jogando'),
    ('finished', 'Terminado'),
    ('abandoned', 'Abandonado');

CREATE TABLE games_new (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    rating          INTEGER CHECK (rating BETWEEN 0 AND 10),
    steam_id        INTEGER,
    status          TEXT    REFERENCES statuses(key) ON DELETE SET NULL,
    image_url       TEXT,
    price           INTEGER,
    currency        TEXT,
    price_initial   INTEGER,
    notes           TEXT,
    launch          TEXT    CHECK (launch IN ('steam', 'exe')),
    exe_path        TEXT,
    target_price    INTEGER,
    target_discount INTEGER CHECK (target_discount BETWEEN 1 AND 100),
    save_path       TEXT,
    release_stage   TEXT    CHECK (release_stage IN ('early_access', 'pre_release')),
    release_date    TEXT,
    achievements    TEXT    CHECK (achievements IN ('hunting', 'platinum'))
);
INSERT INTO games_new (id, name, rating, steam_id, status, image_url, price, currency, price_initial, notes,
                       launch, exe_path, target_price, target_discount, save_path, release_stage, release_date,
                       achievements)
SELECT id, name, rating, steam_id, status, image_url, price, currency, price_initial, notes,
       launch, exe_path, target_price, target_discount, save_path, release_stage, release_date, achievements
FROM games;
UPDATE sqlite_sequence SET seq = (SELECT seq FROM sqlite_sequence WHERE name = 'games') WHERE name = 'games_new';
INSERT INTO sqlite_sequence (name, seq)
SELECT 'games_new', seq FROM sqlite_sequence WHERE name = 'games'
  AND NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'games_new');

CREATE TABLE game_lists_new (
    game_id INTEGER NOT NULL REFERENCES games_new(id) ON DELETE CASCADE,
    list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    PRIMARY KEY (game_id, list_id)
);
INSERT INTO game_lists_new SELECT game_id, list_id FROM game_lists;

CREATE TABLE status_events_new (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL REFERENCES games_new(id) ON DELETE CASCADE,
    status  TEXT    NOT NULL REFERENCES statuses(key) ON DELETE CASCADE,
    at      TEXT    NOT NULL
);
INSERT INTO status_events_new SELECT id, game_id, status, at FROM status_events;

CREATE TABLE play_sessions_new (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id    INTEGER NOT NULL REFERENCES games_new(id) ON DELETE CASCADE,
    started_at TEXT    NOT NULL,
    seconds    INTEGER NOT NULL CHECK (seconds >= 0)
);
INSERT INTO play_sessions_new SELECT id, game_id, started_at, seconds FROM play_sessions;

CREATE TABLE game_notes_new (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL REFERENCES games_new(id) ON DELETE CASCADE,
    title   TEXT    NOT NULL,
    body    TEXT    NOT NULL DEFAULT '',
    image   TEXT
);
INSERT INTO game_notes_new SELECT id, game_id, title, body, image FROM game_notes;

-- Apaga as filhas antigas antes de games.
DROP TABLE game_lists;
DROP TABLE status_events;
DROP TABLE play_sessions;
DROP TABLE game_notes;
DROP TABLE games;

ALTER TABLE games_new RENAME TO games;
ALTER TABLE game_lists_new RENAME TO game_lists;
ALTER TABLE status_events_new RENAME TO status_events;
ALTER TABLE play_sessions_new RENAME TO play_sessions;
ALTER TABLE game_notes_new RENAME TO game_notes;

CREATE UNIQUE INDEX games_steam_id ON games (steam_id);
