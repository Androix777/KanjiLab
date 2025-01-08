SELECT answer_stats.id,
	game_stats_id,
	user_id,
	user.last_name as "user!",
	word,
	word_reading,
	duration,
	is_correct,
	timestamp,
	font_id,
	font.name as "font!"
FROM answer_stats
LEFT JOIN user
ON answer_stats.user_id = user.id
LEFT JOIN font
ON answer_stats.font_id = font.id;