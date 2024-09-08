INSERT INTO answer_stats (
		game_stats_id,
		word,
		word_reading,
		duration,
		is_correct,
		font_id
	)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id;