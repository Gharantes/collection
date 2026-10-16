ALTER TABLE games ADD COLUMN status TEXT CHECK (status IN ('backlog', 'playing', 'finished'));
