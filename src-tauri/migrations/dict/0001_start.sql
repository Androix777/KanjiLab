-- dictionary_info
CREATE TABLE IF NOT EXISTS dictionary_info (guid TEXT NOT NULL, name TEXT NOT NULL);
-- word
CREATE TABLE IF NOT EXISTS word (
	id INTEGER PRIMARY KEY NOT NULL,
	word TEXT UNIQUE NOT NULL,
	frequency INTEGER,
	meanings TEXT NOT NULL
);
-- word_reading
CREATE TABLE IF NOT EXISTS word_reading (
	id INTEGER PRIMARY KEY NOT NULL,
	word_id INTEGER NOT NULL,
	word_reading TEXT NOT NULL,
	FOREIGN KEY(word_id) REFERENCES word(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_word_reading_1 ON word_reading (word_id, word_reading);
CREATE INDEX idx_word_reading_2 ON word_reading (word_id);
-- word_part_reading
CREATE TABLE IF NOT EXISTS word_part_reading (
	id INTEGER PRIMARY KEY NOT NULL,
	word_part TEXT NOT NULL,
	word_part_reading TEXT NOT NULL,
	UNIQUE (word_part, word_part_reading)
);
-- word_reading_word_part_reading
CREATE TABLE IF NOT EXISTS word_reading_word_part_reading (
	word_reading_id INTEGER NOT NULL,
	word_part_reading_id INTEGER NOT NULL,
	FOREIGN KEY(word_reading_id) REFERENCES word_reading(id),
	FOREIGN KEY(word_part_reading_id) REFERENCES word_part_reading(id),
	PRIMARY KEY (word_reading_id, word_part_reading_id)
);
CREATE INDEX idx_word_reading_word_part_reading_1 ON word_reading_word_part_reading (word_part_reading_id);