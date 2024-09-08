INSERT OR IGNORE INTO font (name) VALUES ($1);
SELECT id FROM font WHERE name = $2;
