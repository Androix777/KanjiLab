SELECT answer_stats.id,
	game_stats_id,
	user_id,
	user.last_name as "user!",
	word,
	word_reading,
	duration,
	is_correct,
	round_index,
	answer_stats.timestamp,
	answer_stats.font_id,
	font.name as "font!"
FROM answer_stats
LEFT JOIN user
ON answer_stats.user_id = user.id
LEFT JOIN font
ON answer_stats.font_id = font.id
LEFT JOIN game_stats
ON answer_stats.game_stats_id = game_stats.id
WHERE game_stats.dictionary_id = $1;
