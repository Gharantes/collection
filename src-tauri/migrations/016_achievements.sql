-- Meta de conquistas: NULL = não importam, 'later' = platinar depois de terminar, 'hunting' = caçando a platina.
ALTER TABLE games ADD COLUMN achievements TEXT CHECK (achievements IN ('later', 'hunting'));
