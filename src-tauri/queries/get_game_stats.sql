SELECT game_stats.id,
	rounds_count,
	round_duration,
	min_frequency,
	max_frequency,
	font_id,
	font.name as "font",
	dictionary_id,
	dictionary.name as "dictionary!",
	timestamp,
	real_rounds_count,
	users_count
FROM game_stats
LEFT JOIN font
ON game_stats.font_id = font.id
LEFT JOIN dictionary
ON game_stats.dictionary_id = dictionary.id
WHERE game_stats.id = $1;