-- O que o "Atualizar Dados" confere nos jogos de cada status (preços, Early Access/Pre-release, demos).
-- Abandonado continua de fora de tudo, como antes.
ALTER TABLE statuses ADD COLUMN check_prices INTEGER NOT NULL DEFAULT 1 CHECK (check_prices IN (0, 1));
ALTER TABLE statuses ADD COLUMN check_releases INTEGER NOT NULL DEFAULT 1 CHECK (check_releases IN (0, 1));
ALTER TABLE statuses ADD COLUMN check_demos INTEGER NOT NULL DEFAULT 1 CHECK (check_demos IN (0, 1));
UPDATE statuses SET check_prices = 0, check_releases = 0, check_demos = 0 WHERE key = 'abandoned';
