SELECT word_part_reading
FROM word_part_reading
WHERE word_part = $1 AND dictionary_id = $2;
