-- Delete
WITH dict_id AS (
	SELECT id
	FROM main.dictionary
	WHERE guid = (
			SELECT guid
			FROM dict_db.dictionary_info
			LIMIT 1
		)
)
DELETE FROM main.word_reading_word_part_reading
WHERE word_reading_id IN (
		SELECT wr.id
		FROM main.word_reading wr
			JOIN main.word w ON w.id = wr.word_id
		WHERE w.dictionary_id = (
				SELECT id
				FROM dict_id
			)
	);
WITH dict_id AS (
	SELECT id
	FROM main.dictionary
	WHERE guid = (
			SELECT guid
			FROM dict_db.dictionary_info
			LIMIT 1
		)
)
DELETE FROM main.word_part_reading
WHERE dictionary_id = (
		SELECT id
		FROM dict_id
	);
WITH dict_id AS (
	SELECT id
	FROM main.dictionary
	WHERE guid = (
			SELECT guid
			FROM dict_db.dictionary_info
			LIMIT 1
		)
)
DELETE FROM main.word_reading
WHERE word_id IN (
		SELECT id
		FROM main.word
		WHERE dictionary_id = (
				SELECT id
				FROM dict_id
			)
	);
WITH dict_id AS (
	SELECT id
	FROM main.dictionary
	WHERE guid = (
			SELECT guid
			FROM dict_db.dictionary_info
			LIMIT 1
		)
)
DELETE FROM main.word
WHERE dictionary_id = (
		SELECT id
		FROM dict_id
	);
-- Copy
INSERT INTO main.dictionary (guid, name, is_exist)
SELECT guid,
	name,
	true
FROM dict_db.dictionary_info WHERE true
ON CONFLICT(guid) DO UPDATE SET 
	name = excluded.name,
	is_exist = true;
WITH dict_id AS (
	SELECT id
	FROM main.dictionary
	WHERE guid = (
			SELECT guid
			FROM dict_db.dictionary_info
			LIMIT 1
		)
)
INSERT INTO main.word (word, frequency, dictionary_id, meanings)
SELECT w.word,
	w.frequency,
	(
		SELECT id
		FROM dict_id
	),
	w.meanings
FROM dict_db.word w;
WITH dict_id AS (
	SELECT id
	FROM main.dictionary
	WHERE guid = (
			SELECT guid
			FROM dict_db.dictionary_info
			LIMIT 1
		)
)
INSERT INTO main.word_reading (word_id, word_reading)
SELECT (
		SELECT mw.id
		FROM main.word mw
		WHERE mw.word = dw.word
			AND mw.dictionary_id = (
				SELECT id
				FROM dict_id
			)
	),
	dwr.word_reading
FROM dict_db.word_reading dwr
	JOIN dict_db.word dw ON dw.id = dwr.word_id;
WITH dict_id AS (
	SELECT id
	FROM main.dictionary
	WHERE guid = (
			SELECT guid
			FROM dict_db.dictionary_info
			LIMIT 1
		)
)
INSERT INTO main.word_part_reading (word_part, word_part_reading, dictionary_id)
SELECT wpr.word_part,
	wpr.word_part_reading,
	(
		SELECT id
		FROM dict_id
	)
FROM dict_db.word_part_reading wpr;
WITH dict_id AS (
	SELECT id
	FROM main.dictionary
	WHERE guid = (
			SELECT guid
			FROM dict_db.dictionary_info
			LIMIT 1
		)
)
INSERT INTO main.word_reading_word_part_reading (word_reading_id, word_part_reading_id)
SELECT (
		SELECT mwr.id
		FROM main.word_reading mwr
			JOIN main.word mw ON mw.id = mwr.word_id
			JOIN dict_db.word dw ON dw.word = mw.word
			JOIN dict_db.word_reading dwr ON dwr.word_id = dw.id
			AND dwr.word_reading = mwr.word_reading
		WHERE mw.dictionary_id = (
				SELECT id
				FROM dict_id
			)
			AND dwr.id = dwrwpr.word_reading_id
	),
	(
		SELECT mwpr.id
		FROM main.word_part_reading mwpr
			JOIN dict_db.word_part_reading dwpr ON dwpr.word_part = mwpr.word_part
			AND dwpr.word_part_reading = mwpr.word_part_reading
		WHERE mwpr.dictionary_id = (
				SELECT id
				FROM dict_id
			)
			AND dwpr.id = dwrwpr.word_part_reading_id
	)
FROM dict_db.word_reading_word_part_reading dwrwpr;
