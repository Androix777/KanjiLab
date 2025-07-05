-- dictionary
CREATE TABLE IF NOT EXISTS dictionary (
	id INTEGER PRIMARY KEY NOT NULL,
	guid TEXT UNIQUE NOT NULL,
	name TEXT NOT NULL,
    is_exist BOOLEAN NOT NULL
);
-- font
CREATE TABLE IF NOT EXISTS font (
	id INTEGER PRIMARY KEY NOT NULL,
	name TEXT UNIQUE NOT NULL
);
-- word
CREATE TABLE IF NOT EXISTS word (
	id INTEGER PRIMARY KEY NOT NULL,
	word TEXT NOT NULL,
	frequency INTEGER,
	dictionary_id INTEGER NOT NULL,
	meanings TEXT NOT NULL,
	FOREIGN KEY(dictionary_id) REFERENCES dictionary(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_word_1 ON word (word, dictionary_id);
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
	dictionary_id INTEGER NOT NULL,
	FOREIGN KEY(dictionary_id) REFERENCES dictionary(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_word_part_reading_1 ON word_part_reading (word_part, word_part_reading, dictionary_id);
-- word_reading_word_part_reading
CREATE TABLE IF NOT EXISTS word_reading_word_part_reading (
	word_reading_id INTEGER NOT NULL,
	word_part_reading_id INTEGER NOT NULL,
	FOREIGN KEY(word_reading_id) REFERENCES word_reading(id),
	FOREIGN KEY(word_part_reading_id) REFERENCES word_part_reading(id),
	PRIMARY KEY (word_reading_id, word_part_reading_id)
);
CREATE INDEX idx_word_reading_word_part_reading_1 ON word_reading_word_part_reading (word_part_reading_id);
-- user
CREATE TABLE IF NOT EXISTS user (
	id INTEGER PRIMARY KEY NOT NULL,
	key TEXT UNIQUE NOT NULL,
	last_name TEXT NOT NULL
);
-- answer_stats
CREATE TABLE IF NOT EXISTS answer_stats (
	id INTEGER PRIMARY KEY NOT NULL,
	game_stats_id INTEGER NOT NULL,
	user_id INTEGER NOT NULL,
	word TEXT NOT NULL,
	word_reading TEXT NOT NULL,
	duration INTEGER,
	is_correct INTEGER NOT NULL,
	round_index INTEGER NOT NULL,
	timestamp DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	font_id INTEGER NOT NULL,
	FOREIGN KEY(game_stats_id) REFERENCES game_stats(id),
	FOREIGN KEY(font_id) REFERENCES font(id),
	FOREIGN KEY(user_id) REFERENCES user(id)
);
-- game_stats
CREATE TABLE IF NOT EXISTS game_stats (
	id INTEGER PRIMARY KEY NOT NULL,
	rounds_count INTEGER NOT NULL,
	round_duration INTEGER NOT NULL,
	min_frequency INTEGER NOT NULL,
	max_frequency INTEGER,
	font_id INTEGER,
	dictionary_id INTEGER NOT NULL,
	timestamp DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
	real_rounds_count INTEGER NOT NULL DEFAULT 0,
	users_count INTEGER NOT NULL DEFAULT 0,
	FOREIGN KEY(font_id) REFERENCES font(id)
);
CREATE TRIGGER IF NOT EXISTS update_real_rounds_count
AFTER
INSERT ON answer_stats BEGIN
UPDATE game_stats
SET real_rounds_count = (
		SELECT MAX(round_index) + 1
		FROM answer_stats
		WHERE game_stats_id = NEW.game_stats_id
	)
WHERE id = NEW.game_stats_id;
END;
CREATE TRIGGER IF NOT EXISTS update_users_count
AFTER
INSERT ON answer_stats BEGIN
UPDATE game_stats
SET users_count = (
		SELECT COUNT(DISTINCT user_id)
		FROM answer_stats
		WHERE game_stats_id = NEW.game_stats_id
	)
WHERE id = NEW.game_stats_id;
END;