SELECT sum(
		CASE
			WHEN word_reading_id NOT NULL THEN 1
			ELSE 0
		END
	) AS "correct_count!",
	sum(
		CASE
			WHEN word_reading_id NOT NULL THEN 0
			ELSE 1
		END
	) as "wrong_count!"
FROM word_answer_results