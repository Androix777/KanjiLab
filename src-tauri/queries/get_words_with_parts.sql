WITH filtered_words AS (
	SELECT id,
		word,
		meanings
	FROM word
	WHERE (
			frequency IS NULL
			OR frequency >= $2
		)
		AND (
			$3 IS NULL
			OR frequency <= $3
		)
		AND (
			dictionary_id = $6
		)
),
filtered_word_parts AS (
	SELECT id
	FROM word_part_reading
	WHERE word_part = $4
		AND (
			$5 IS NULL
			OR word_part_reading = $5
		)
),
filtered_word_readings AS (
	SELECT wr.id,
		wr.word_id,
		wr.word_reading
	FROM word_reading wr
		JOIN word_reading_word_part_reading wrwpr ON wr.id = wrwpr.word_reading_id
	WHERE wrwpr.word_part_reading_id IN (
			SELECT id
			FROM filtered_word_parts
		)
),
selected_words AS (
	SELECT fw.id,
		fw.word,
		fw.meanings
	FROM filtered_words fw
		JOIN filtered_word_readings fwr ON fw.id = fwr.word_id
	GROUP BY fw.id,
		fw.word
	ORDER BY RANDOM()
	LIMIT $1
)
SELECT GROUP_CONCAT(fwr.word_reading) AS "word_readings!: String",
	GROUP_CONCAT(fwr.id) AS "word_reading_ids!: String",
	sw.id AS "id!",
	sw.word AS "word!",
	sw.meanings AS "meanings"
FROM selected_words sw
	JOIN filtered_word_readings fwr ON sw.id = fwr.word_id
GROUP BY sw.id,
	sw.word;