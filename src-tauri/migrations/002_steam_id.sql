ALTER TABLE games ADD COLUMN steam_id INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS games_steam_id ON games (steam_id);
