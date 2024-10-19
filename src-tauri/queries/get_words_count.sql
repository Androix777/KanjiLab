WITH filtered_words AS (
	SELECT id
	FROM word
	WHERE (
			frequency IS NULL
			OR frequency >= $1
		)
		AND (
			$2 IS NULL
			OR frequency <= $2
		)
),
filtered_word_parts AS (
	SELECT id
	FROM word_part_reading
	WHERE (
			$3 IS NULL
			OR word_part = $3
		)
		AND (
			$4 IS NULL
			OR word_part_reading = $4
		)
),
filtered_word_readings AS (
	SELECT DISTINCT wr.word_id
	FROM word_reading wr
		LEFT JOIN word_reading_word_part_reading wrwpr ON wr.id = wrwpr.word_reading_id
	WHERE $3 IS NULL
		OR wrwpr.word_part_reading_id IN (
			SELECT id
			FROM filtered_word_parts
		)
)
SELECT COUNT(*) AS count
FROM filtered_words fw
	JOIN filtered_word_readings fwr ON fw.id = fwr.word_id;