SELECT
    id as "id: i64",
    word,
    due as "due: NaiveDateTime",
    stability,
    difficulty,
    elapsed_days,
    scheduled_days,
    reps,
    lapses,
    state,
    last_review as "last_review: NaiveDateTime"
FROM card_fsrs
WHERE word = ?