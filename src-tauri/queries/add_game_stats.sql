INSERT INTO game_stats (
		rounds_count,
		round_duration,
		min_frequency,
		max_frequency,
		font_id,
		dictionary_id
	)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id;