INSERT INTO answer_stats (
		game_stats_id,
		user_id,
		word,
		word_reading,
		duration,
		is_correct,
		round_index,
		font_id
	)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id;
