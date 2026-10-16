-- Preço sem desconto, em centavos.
ALTER TABLE games ADD COLUMN price_initial INTEGER;
UPDATE games SET price_initial = price;
