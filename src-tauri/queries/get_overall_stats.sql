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
FROM answer_stats
JOIN game_stats ON answer_stats.game_stats_id = game_stats.id
WHERE user_id = $1 AND game_stats.dictionary_id = $2;
