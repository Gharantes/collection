ALTER TABLE games ADD COLUMN launch TEXT CHECK (launch IN ('steam', 'exe'));
ALTER TABLE games ADD COLUMN exe_path TEXT;
