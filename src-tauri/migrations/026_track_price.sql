-- "Quero comprar": o "Atualizar Dados" confere o preço só dos jogos marcados (antes era por status).
-- Começam marcados os que tinham o preço conferido pelo status e que o usuário não tem.
-- As colunas check_prices de statuses e no_status_checks ficam sem uso.
ALTER TABLE games ADD COLUMN track_price INTEGER NOT NULL DEFAULT 0 CHECK (track_price IN (0, 1));
UPDATE games SET track_price = 1
WHERE steam_id IS NOT NULL AND owned = 0 AND (
  status IN (SELECT key FROM statuses WHERE check_prices = 1)
  OR (status IS NULL AND (SELECT check_prices FROM no_status_checks WHERE id = 1) = 1)
);
