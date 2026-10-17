-- Early Access ou Pre-release (um ou outro) e a data de lançamento.
ALTER TABLE games ADD COLUMN release_stage TEXT CHECK (release_stage IN ('early_access', 'pre_release'));
ALTER TABLE games ADD COLUMN release_date TEXT;
