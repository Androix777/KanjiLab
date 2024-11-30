INSERT OR IGNORE INTO user (key, last_name) VALUES ($1, $2);
UPDATE user SET last_name = $3 WHERE key = $4;
SELECT id FROM user WHERE key = $5;
