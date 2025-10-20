INSERT INTO card_fsrs (
    word, due, stability, difficulty, elapsed_days,
    scheduled_days, reps, lapses, state, last_review
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(word) DO UPDATE SET
    due = excluded.due,
    stability = excluded.stability,
    difficulty = excluded.difficulty,
    elapsed_days = excluded.elapsed_days,
    scheduled_days = excluded.scheduled_days,
    reps = excluded.reps,
    lapses = excluded.lapses,
    state = excluded.state,
    last_review = excluded.last_review,
    updated_at = CURRENT_TIMESTAMP