SELECT 
    w.id AS "word_id!", 
    w.word AS "word!", 
    wr.id AS reading_id, 
    wr.word_reading
FROM (
    SELECT id, word 
    FROM word 
    WHERE frequency > $2 AND frequency < $3
    ORDER BY RANDOM() 
    LIMIT $1
) AS w
JOIN word_reading AS wr ON w.id = wr.word_id
