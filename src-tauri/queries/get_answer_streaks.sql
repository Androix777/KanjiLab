WITH RankedAnswers AS (
    SELECT gs.id AS game_id,
        ans.is_correct,
        ROW_NUMBER() OVER (
            PARTITION BY gs.id
            ORDER BY ans.id
        ) AS row_num_general,
        ROW_NUMBER() OVER (
            PARTITION BY gs.id,
            ans.is_correct
            ORDER BY ans.id
        ) AS row_num_correct
    FROM game_stats gs
        JOIN answer_stats ans ON gs.id = ans.game_stats_id
    WHERE gs.min_frequency = $1
        AND (
            (
                $2 IS NULL
                AND gs.max_frequency IS NULL
            )
            OR
            (
                $2 IS NOT NULL
                AND (
                    gs.max_frequency >= $2
                    OR gs.max_frequency IS NULL
                )
            )
        )
        AND ans.user_id = $4
        AND gs.dictionary_id = $5
)
SELECT game_id,
    COUNT(*) AS length
FROM RankedAnswers
WHERE is_correct = 1
GROUP BY game_id,
    (row_num_general - row_num_correct)
ORDER BY length DESC
LIMIT $3;