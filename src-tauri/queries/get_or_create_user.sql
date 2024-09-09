INSERT OR IGNORE INTO user (key) VALUES ($1);
SELECT id FROM user WHERE key = $2;
