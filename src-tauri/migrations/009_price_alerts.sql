-- Alerta de promoção: preço-alvo em centavos e/ou desconto mínimo em %.
ALTER TABLE games ADD COLUMN target_price INTEGER;
ALTER TABLE games ADD COLUMN target_discount INTEGER CHECK (target_discount BETWEEN 1 AND 100);
