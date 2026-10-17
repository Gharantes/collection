-- Etapas de conquistas viram 'hunting' = caçando a platina e 'platinum' = platinado.
ALTER TABLE games ADD COLUMN achievements_new TEXT CHECK (achievements_new IN ('hunting', 'platinum'));
UPDATE games SET achievements_new = CASE achievements WHEN 'later' THEN 'hunting' WHEN 'hunting' THEN 'platinum' END;
ALTER TABLE games DROP COLUMN achievements;
ALTER TABLE games RENAME COLUMN achievements_new TO achievements;
