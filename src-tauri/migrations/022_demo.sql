-- Demo do jogo na Steam; o tempo jogado nela conta para o jogo.
ALTER TABLE games ADD COLUMN demo_steam_id INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS games_demo_steam_id ON games (demo_steam_id);
