INSERT INTO game_stats (
		rounds_count,
		round_duration,
		min_frequency,
		max_frequency,
		word_part,
		word_part_reading,
		font_id,
		dictionary_id
	)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id;