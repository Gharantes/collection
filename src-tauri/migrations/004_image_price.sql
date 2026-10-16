ALTER TABLE games ADD COLUMN image_url TEXT;
-- Preço em centavos, no momento em que o jogo foi adicionado.
ALTER TABLE games ADD COLUMN price INTEGER;
ALTER TABLE games ADD COLUMN currency TEXT;
