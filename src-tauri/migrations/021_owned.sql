-- Jogos que o usuário tem; os outros aparecem escurecidos.
ALTER TABLE games ADD COLUMN owned INTEGER NOT NULL DEFAULT 0 CHECK (owned IN (0, 1));
