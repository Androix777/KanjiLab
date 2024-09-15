SELECT id,
	game_stats_id,
	user_id,
	word,
	word_reading,
	duration,
	is_correct,
	timestamp,
	font_id
FROM answer_stats
WHERE game_stats_id = $1;