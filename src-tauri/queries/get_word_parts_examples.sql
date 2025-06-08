WITH source_parts AS (
	SELECT DISTINCT wpr.id AS part_id,
		wpr.word_part,
		wpr.word_part_reading,
		ROW_NUMBER() OVER (
			ORDER BY wrwpr.rowid
		) AS part_order
	FROM word_reading wr
		JOIN word_reading_word_part_reading wrwpr ON wr.id = wrwpr.word_reading_id
		JOIN word_part_reading wpr ON wrwpr.word_part_reading_id = wpr.id
	WHERE wr.id = $1 AND wpr.dictionary_id = $3
),
matching_words AS (
	SELECT sp.part_id,
		sp.word_part,
		sp.word_part_reading,
		sp.part_order,
		w.word,
		w.frequency,
		wr.word_reading,
		ROW_NUMBER() OVER (
			PARTITION BY sp.part_id
			ORDER BY CASE
					WHEN w.frequency IS NULL THEN 1
					ELSE 0
				END,
				w.frequency ASC
		) AS rank
	FROM source_parts sp
		JOIN word_reading_word_part_reading wrwpr ON sp.part_id = wrwpr.word_part_reading_id
		JOIN word_reading wr ON wrwpr.word_reading_id = wr.id
		JOIN word w ON wr.word_id = w.id
	WHERE w.id != (
			SELECT word_id
			FROM word_reading
			WHERE id = $1
		) AND w.dictionary_id = $4
),
ranked_words AS (
	SELECT part_id,
		word_part,
		word_part_reading,
		part_order,
		word,
		frequency,
		word_reading,
		rank,
		COUNT(*) OVER (PARTITION BY part_id) as total_words,
		SUM(
			CASE
				WHEN frequency IS NOT NULL THEN 1
				ELSE 0
			END
		) OVER (PARTITION BY part_id) as non_null_count
	FROM matching_words
)
SELECT part_id,
	word_part,
	word_part_reading,
	GROUP_CONCAT(word) AS top_words,
	GROUP_CONCAT(COALESCE(frequency, 'NULL')) AS "top_words_frequencies: String",
	GROUP_CONCAT(word_reading) AS top_words_readings
FROM ranked_words
WHERE rank <= $2
	AND (
		frequency IS NOT NULL
		OR rank <= ($2 - non_null_count)
		OR non_null_count = 0
	)
GROUP BY part_id,
	word_part,
	word_part_reading,
	part_order
ORDER BY part_order;
