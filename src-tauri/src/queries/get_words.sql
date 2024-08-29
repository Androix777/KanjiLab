SELECT GROUP_CONCAT(wr.word_reading) AS "word_readings!: String",
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
		ORDER BY RANDOM()
		LIMIT $1
	) AS w
	JOIN word_reading AS wr ON w.id = wr.word_id
GROUP BY w.id,
	w.word