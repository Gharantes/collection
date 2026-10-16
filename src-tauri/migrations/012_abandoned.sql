-- Status "abandoned": recria games e as tabelas filhas com o novo CHECK, mantendo os dados.
CREATE TABLE games_new (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    rating          INTEGER CHECK (rating BETWEEN 0 AND 10),
    steam_id        INTEGER,
    status          TEXT    CHECK (status IN ('backlog', 'playing', 'finished', 'abandoned')),
    image_url       TEXT,
    price           INTEGER,
    currency        TEXT,
    price_initial   INTEGER,
    notes           TEXT,
    launch          TEXT    CHECK (launch IN ('steam', 'exe')),
    exe_path        TEXT,
    target_price    INTEGER,
    target_discount INTEGER CHECK (target_discount BETWEEN 1 AND 100),
    save_path       TEXT
);
INSERT INTO games_new (id, name, rating, steam_id, status, image_url, price, currency, price_initial, notes,
                       launch, exe_path, target_price, target_discount, save_path)
SELECT id, name, rating, steam_id, status, image_url, price, currency, price_initial, notes,
       launch, exe_path, target_price, target_discount, save_path
FROM games;
UPDATE sqlite_sequence SET seq = (SELECT seq FROM sqlite_sequence WHERE name = 'games') WHERE name = 'games_new';

CREATE TABLE game_lists_new (
    game_id INTEGER NOT NULL REFERENCES games_new(id) ON DELETE CASCADE,
    list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    PRIMARY KEY (game_id, list_id)
);
INSERT INTO game_lists_new SELECT game_id, list_id FROM game_lists;

CREATE TABLE status_events_new (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL REFERENCES games_new(id) ON DELETE CASCADE,
    status  TEXT    NOT NULL CHECK (status IN ('backlog', 'playing', 'finished', 'abandoned')),
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

-- Apaga as filhas antigas antes de games.
DROP TABLE game_lists;
DROP TABLE status_events;
DROP TABLE play_sessions;
DROP TABLE games;

ALTER TABLE games_new RENAME TO games;
ALTER TABLE game_lists_new RENAME TO game_lists;
ALTER TABLE status_events_new RENAME TO status_events;
ALTER TABLE play_sessions_new RENAME TO play_sessions;

CREATE UNIQUE INDEX games_steam_id ON games (steam_id);
