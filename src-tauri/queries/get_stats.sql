SELECT SUM(
		CASE
			WHEN is_correct = 1 THEN 1
			ELSE 0
		END
	) AS "correct_count!",
	SUM(
		CASE
			WHEN is_correct = 0 THEN 1
			ELSE 0
		END
	) AS "wrong_count!"
FROM answer_stats;