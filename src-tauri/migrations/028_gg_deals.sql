-- Preços da gg.deals (versão Steam), em centavos: atual e menor histórico nas lojas oficiais e nas keyshops.
ALTER TABLE games ADD COLUMN gg_retail INTEGER;
ALTER TABLE games ADD COLUMN gg_keyshop INTEGER;
ALTER TABLE games ADD COLUMN gg_retail_low INTEGER;
ALTER TABLE games ADD COLUMN gg_keyshop_low INTEGER;
ALTER TABLE games ADD COLUMN gg_url TEXT;
