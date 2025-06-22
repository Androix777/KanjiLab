DELETE FROM word_reading_word_part_reading
WHERE word_reading_id IN (
        SELECT wr.id
        FROM word_reading wr
            JOIN word w ON w.id = wr.word_id
        WHERE w.dictionary_id = ?
    );

DELETE FROM word_part_reading
WHERE dictionary_id = ?;

DELETE FROM word_reading
WHERE word_id IN (
        SELECT id
        FROM word
        WHERE dictionary_id = ?
    );

DELETE FROM word
WHERE dictionary_id = ?;

UPDATE dictionary 
SET is_exist = false 
WHERE id = ?;
