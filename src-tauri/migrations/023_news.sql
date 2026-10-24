-- Buscar notícias da Steam na página do jogo; desligado até o usuário ligar.
ALTER TABLE games ADD COLUMN news INTEGER NOT NULL DEFAULT 0 CHECK (news IN (0, 1));
