SELECT DISTINCT word_part
FROM word_part_reading
WHERE dictionary_id = $1;
