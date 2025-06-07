SELECT GROUP_CONCAT(wr.word_reading) AS "word_readings!: String",
	GROUP_CONCAT(wr.id) AS "word_reading_ids!: String",
	w.id AS "id!",
	w.word AS "word!",
	w.meanings AS "meanings"
FROM (
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
				dictionary_id = $4
			)
		ORDER BY RANDOM()
		LIMIT $1
	) AS w
	JOIN word_reading AS wr ON w.id = wr.word_id
GROUP BY w.id,
	w.word