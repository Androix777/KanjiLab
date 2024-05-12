-- SQLite
SELECT w.word, w.frequency, wr.word_reading
FROM word w
JOIN word_reading wr ON w.id = wr.word_id
LEFT JOIN word_reading_word_part_reading wrwpr ON wr.id = wrwpr.word_reading_id
WHERE wrwpr.word_reading_id IS NULL AND w.frequency IS NOT NULL
ORDER BY w.frequency ASC;