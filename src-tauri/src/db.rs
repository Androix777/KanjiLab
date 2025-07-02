use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::{query_file_as, sqlite::{SqliteConnectOptions, SqlitePool}};
use std::sync::LazyLock;

use crate::tools::get_executable_file_path;
use sqlx::Acquire;

static DB_POOL: LazyLock<SqlitePool> = LazyLock::new(|| {
    let path_str = get_executable_file_path()
        .unwrap()
        .join("main.db")
        .into_os_string()
        .into_string()
        .unwrap();

    let options = SqliteConnectOptions::new()
        .filename(path_str)
        .create_if_missing(true);
    
    SqlitePool::connect_lazy_with(options)
});

pub async fn init_db() {
    let pool = (*DB_POOL).to_owned();
    sqlx::migrate!("./migrations/main")
        .run(&pool)
        .await
        .unwrap();
}

pub async fn close_db() {
    let pool = (*DB_POOL).to_owned();
    pool.close().await;
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DictionaryInfo {
    id: i64,
    guid: String,
    name: String,
    is_exist: bool,
}

#[tauri::command]
pub async fn delete_dictionary(id: i64) -> Result<(), String> {
    sqlx::query_file_as!(i64, "./queries/delete_dictionary.sql", id, id, id, id, id)
        .execute(&*DB_POOL)
        .await
        .map_err(|e| format!("Failed to delete dictionary: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn get_dictionaries() -> Result<Vec<DictionaryInfo>, String> {
    let data = sqlx::query_file_as!(DictionaryInfo, "./queries/get_all_dictionaries.sql")
        .fetch_all(&*DB_POOL)
        .await
        .map_err(|e| e.to_string())?;

    Ok(data)
}

#[tauri::command]
pub async fn import_dictionary(dict_path: &str) -> Result<(), String> {
    let dict_pool = SqlitePool::connect(dict_path)
        .await
        .map_err(|e| format!("Failed to connect to dictionary database: {}", e))?;

    sqlx::migrate!("./migrations/dict")
        .run(&dict_pool)
        .await
        .map_err(|e| format!("Failed to migrate dictionary database: {}", e))?;

    dict_pool.close().await;

    let pool = (*DB_POOL).to_owned();

    let mut conn = pool
        .acquire()
        .await
        .map_err(|e| format!("Failed to acquire connection: {}", e))?;

    sqlx::query("ATTACH DATABASE ? AS dict_db")
        .bind(dict_path)
        .execute(&mut *conn)
        .await
        .map_err(|e| format!("Failed to attach dictionary: {}", e))?;

    let mut tx = conn
        .begin()
        .await
        .map_err(|e| format!("Failed to begin transaction: {}", e))?;

    let sql = include_str!("../queries/import_dictionary.sql");

    let import_result = sqlx::query(sql).execute(&mut *tx).await;

    let result = match import_result {
        Ok(_) => tx
            .commit()
            .await
            .map_err(|e| format!("Failed to commit transaction: {}", e)),
        Err(e) => {
            let _ = tx.rollback().await;
            Err(format!("Import failed: {}", e))
        }
    };

    sqlx::query("DETACH DATABASE dict_db")
        .execute(&mut *conn)
        .await
        .map_err(|e| format!("Failed to detach dictionary: {}", e))?;

    result
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WordPartExample {
    word: String,
    frequency: Option<i64>,
    reading: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WordPartInfo {
    word_part: String,
    word_part_reading: String,
    examples: Vec<WordPartExample>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadingWithParts {
    reading: String,
    parts: Vec<WordPartInfo>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WordWithReadings {
    word: String,
    meanings: Vec<Vec<Vec<String>>>,
    readings: Vec<ReadingWithParts>,
}

#[tauri::command]
pub async fn get_words(
    count: i64,
    min_frequency: i64,
    max_frequency: Option<i64>,
    word_part: Option<&str>,
    word_part_reading: Option<&str>,
    examples_count: i64,
    dictionary_id: i64,
) -> Result<Vec<WordWithReadings>, String> {
    const GLOSS_SEPARATOR: &str = "␞";
    const SENSE_SEPARATOR: &str = "␝";
    const KEB_SEPARATOR: &str = "␟";
    const READINGS_SEPARATOR: &str = ",";

    #[allow(dead_code)]
    struct RawData {
        id: i64,
        word: String,
        meanings: String,
        word_readings: String,
        word_reading_ids: String,
    }

    let raw_data = if let Some(part) = word_part {
        query_file_as!(
            RawData,
            "./queries/get_words_with_parts.sql",
            count,
            min_frequency,
            max_frequency,
            part,
            word_part_reading,
            dictionary_id
        )
        .fetch_all(&*DB_POOL)
        .await
        .map_err(|e| e.to_string())?
    } else {
        query_file_as!(
            RawData,
            "./queries/get_words.sql",
            count,
            min_frequency,
            max_frequency,
            dictionary_id
        )
        .fetch_all(&*DB_POOL)
        .await
        .map_err(|e| e.to_string())?
    };

    let mut result = Vec::new();

    for raw_word in raw_data {
        let reading_ids: Vec<i64> = raw_word
            .word_reading_ids
            .split(READINGS_SEPARATOR)
            .filter_map(|id| id.parse().ok())
            .collect();

        let readings: Vec<String> = raw_word
            .word_readings
            .split(READINGS_SEPARATOR)
            .map(String::from)
            .collect();

        let meanings: Vec<Vec<Vec<String>>> = raw_word
            .meanings
            .split(KEB_SEPARATOR)
            .map(|keb| {
                keb.split(SENSE_SEPARATOR)
                    .map(|sense| sense.split(GLOSS_SEPARATOR).map(String::from).collect())
                    .collect()
            })
            .collect();

        let mut readings_with_parts = Vec::new();
        for (reading_id, reading) in reading_ids.into_iter().zip(readings.into_iter()) {
            match get_reading_with_parts(reading_id, reading, examples_count, dictionary_id).await {
                Ok(reading_with_parts) => readings_with_parts.push(reading_with_parts),
                Err(e) => eprintln!("Error getting reading with parts: {}", e),
            }
        }

        result.push(WordWithReadings {
            word: raw_word.word,
            meanings,
            readings: readings_with_parts,
        });
    }

    Ok(result)
}

#[tauri::command]
pub async fn get_words_count(
    min_frequency: i64,
    max_frequency: Option<i64>,
    word_part: Option<&str>,
    word_part_reading: Option<&str>,
    dictionary_id: i64,
) -> Result<i64, String> {
    #[allow(dead_code)]
    struct RawData {
        count: i64,
    }

    let data = query_file_as!(
        RawData,
        "./queries/get_words_count.sql",
        min_frequency,
        max_frequency,
        word_part,
        word_part_reading,
        dictionary_id
    )
    .fetch_one(&*DB_POOL)
    .await
    .map_err(|e| e.to_string())?;

    Ok(data.count)
}

async fn get_reading_with_parts(
    reading_id: i64,
    reading: String,
    examples_count: i64,
    dictionary_id: i64,
) -> Result<ReadingWithParts, String> {
    #[allow(dead_code)]
    struct RawPartData {
        part_id: i64,
        word_part: String,
        word_part_reading: String,
        top_words: String,
        top_words_frequencies: String,
        top_words_readings: String,
    }

    let raw_part_data = query_file_as!(
        RawPartData,
        "./queries/get_word_parts_examples.sql",
        reading_id,
        examples_count,
        dictionary_id,
        dictionary_id
    )
    .fetch_all(&*DB_POOL)
    .await
    .map_err(|e| e.to_string())?;

    let mut parts = Vec::new();

    for raw_part in raw_part_data {
        let words: Vec<&str> = raw_part.top_words.split(',').collect();
        let frequencies: Vec<&str> = raw_part.top_words_frequencies.split(',').collect();
        let readings: Vec<&str> = raw_part.top_words_readings.split(',').collect();

        let examples: Vec<WordPartExample> = words
            .into_iter()
            .zip(frequencies.into_iter())
            .zip(readings.into_iter())
            .map(|((word, frequency), reading)| WordPartExample {
                word: word.to_string(),
                frequency: frequency.parse().ok(),
                reading: reading.to_string(),
            })
            .collect();

        parts.push(WordPartInfo {
            word_part: raw_part.word_part,
            word_part_reading: raw_part.word_part_reading,
            examples,
        });
    }

    Ok(ReadingWithParts { reading, parts })
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatsInfo {
    correct_count: i64,
    wrong_count: i64,
}

#[tauri::command]
pub async fn get_overall_stats(user_key: &str, dictionary_id: i64) -> Result<StatsInfo, String> {
    let user_id = get_user_id(user_key, None).await?;
    let data = query_file_as!(
        StatsInfo,
        "./queries/get_overall_stats.sql",
        user_id,
        dictionary_id
    )
    .fetch_one(&*DB_POOL)
    .await
    .map_err(|e| e.to_string())?;

    Ok(data)
}

#[tauri::command]
pub async fn get_font_id(name: &str) -> Result<i64, String> {
    struct RawData {
        id: i64,
    }

    let font_id = sqlx::query_file_as!(RawData, "./queries/get_or_create_font.sql", name, name)
        .fetch_one(&*DB_POOL)
        .await
        .map_err(|e| e.to_string())?;

    Ok(font_id.id)
}

#[tauri::command]
pub async fn get_user_id(key: &str, last_name: Option<&str>) -> Result<i64, String> {
    struct RawData {
        id: i64,
    }

    if let Some(name) = last_name {
        let user_id = sqlx::query_file_as!(
            RawData,
            "./queries/get_or_create_user.sql",
            key,
            name,
            name,
            key,
            key
        )
        .fetch_one(&*DB_POOL)
        .await
        .map_err(|e| e.to_string())?;

        Ok(user_id.id)
    } else {
        let userdata = sqlx::query_file_as!(User, "./queries/get_userdata_by_key.sql", key)
            .fetch_optional(&*DB_POOL)
            .await
            .map_err(|e| e.to_string())?;

        if let Some(user) = userdata {
            Ok(user.id)
        } else {
            Err("User not found".to_string())
        }
    }
}

#[allow(clippy::too_many_arguments)]
#[tauri::command]
pub async fn add_answer_stats(
    game_stats_id: i64,
    user_key: &str,
    user_name: &str,
    word: &str,
    word_reading: &str,
    duration: Option<i64>,
    is_correct: bool,
    round_index: i64,
    font_id: i64,
) -> Result<i64, String> {
    struct RawData {
        id: i64,
    }

    let user_id = get_user_id(user_key, Some(user_name))
        .await
        .map_err(|e| e.to_string())?;

    let result = query_file_as!(
        RawData,
        "./queries/add_answer_stats.sql",
        game_stats_id,
        user_id,
        word,
        word_reading,
        duration,
        is_correct,
        round_index,
        font_id,
    )
    .fetch_one(&*DB_POOL)
    .await
    .map_err(|e| e.to_string())?;

    Ok(result.id)
}

#[tauri::command]
pub async fn add_game_stats(
    rounds_count: i64,
    round_duration: i64,
    min_frequency: i64,
    max_frequency: Option<i64>,
    font_id: Option<i64>,
    dictionary_id: i64,
) -> Result<i64, String> {
    struct RawData {
        id: i64,
    }

    let result = sqlx::query_file_as!(
        RawData,
        "./queries/add_game_stats.sql",
        rounds_count,
        round_duration,
        min_frequency,
        max_frequency,
        font_id,
        dictionary_id
    )
    .fetch_one(&*DB_POOL)
    .await
    .map_err(|e| e.to_string())?;

    Ok(result.id)
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnswerStreaks {
    game_id: i64,
    length: i64,
}

#[tauri::command]
pub async fn get_answer_streaks(
    min_frequency: i64,
    max_frequency: Option<i64>,
    count: i64,
    user_key: &str,
    dictionary_id: i64,
) -> Result<Vec<AnswerStreaks>, String> {
    let user_id = get_user_id(user_key, None).await?;
    let data = sqlx::query_file_as!(
        AnswerStreaks,
        "./queries/get_answer_streaks.sql",
        min_frequency,
        max_frequency,
        count,
        user_id,
        dictionary_id
    )
    .fetch_all(&*DB_POOL)
    .await
    .map_err(|e| e.to_string())?;

    Ok(data)
}

#[tauri::command]
pub async fn get_word_parts(dictionary_id: i64) -> Result<Vec<String>, String> {
    let data = sqlx::query_file!("./queries/get_word_parts.sql", dictionary_id)
        .map(|row| row.word_part)
        .fetch_all(&*DB_POOL)
        .await
        .map_err(|e| e.to_string())?;

    Ok(data)
}

#[tauri::command]
pub async fn get_word_part_readings(
    word_part: String,
    dictionary_id: i64,
) -> Result<Vec<String>, String> {
    let data = sqlx::query_file!(
        "./queries/get_word_part_readings.sql",
        word_part,
        dictionary_id
    )
    .map(|row| row.word_part_reading)
    .fetch_all(&*DB_POOL)
    .await
    .map_err(|e| e.to_string())?;

    Ok(data)
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameStats {
    id: i64,
    rounds_count: i64,
    round_duration: i64,
    min_frequency: i64,
    max_frequency: Option<i64>,
    font_id: Option<i64>,
    font: Option<String>,
    dictionary_id: i64,
    dictionary: String,
    real_rounds_count: i64,
    users_count: i64,
    timestamp: NaiveDateTime,
}

#[tauri::command]
pub async fn get_all_games_stats(dictionary_id: i64) -> Result<Vec<GameStats>, String> {
    let data = sqlx::query_file_as!(
        GameStats,
        "./queries/get_all_games_stats.sql",
        dictionary_id
    )
    .fetch_all(&*DB_POOL)
    .await
    .map_err(|e| e.to_string())?;

    Ok(data)
}

#[tauri::command]
pub async fn get_game_stats(id: i64) -> Result<GameStats, String> {
    let data = sqlx::query_file_as!(GameStats, "./queries/get_game_stats.sql", id)
        .fetch_optional(&*DB_POOL)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(gs) = data {
        Ok(gs)
    } else {
        Err(format!("Game stats not found for id: {}", id))
    }
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnswerStats {
    id: i64,
    game_stats_id: i64,
    user_id: i64,
    user: String,
    word: String,
    word_reading: String,
    duration: Option<i64>,
    is_correct: bool,
    round_index: i64,
    timestamp: NaiveDateTime,
    font_id: i64,
    font: String,
}

#[derive(sqlx::FromRow)]
struct AnswerStatsDB {
    id: i64,
    game_stats_id: i64,
    user_id: i64,
    user: String,
    word: String,
    word_reading: String,
    duration: Option<i64>,
    is_correct: i64,
    round_index: i64,
    timestamp: NaiveDateTime,
    font_id: i64,
    font: String,
}

impl From<AnswerStatsDB> for AnswerStats {
    fn from(db: AnswerStatsDB) -> Self {
        AnswerStats {
            id: db.id,
            game_stats_id: db.game_stats_id,
            user_id: db.user_id,
            user: db.user,
            word: db.word,
            word_reading: db.word_reading,
            duration: db.duration,
            is_correct: db.is_correct != 0,
            round_index: db.round_index,
            timestamp: db.timestamp,
            font_id: db.font_id,
            font: db.font,
        }
    }
}

#[tauri::command]
pub async fn get_answer_stats_by_game(game_stats_id: i64) -> Result<Vec<AnswerStats>, String> {
    let data = sqlx::query_file_as!(
        AnswerStatsDB,
        "./queries/get_answer_stats_by_game.sql",
        game_stats_id
    )
    .fetch_all(&*DB_POOL)
    .await
    .map_err(|e| e.to_string())?;

    Ok(data.into_iter().map(AnswerStats::from).collect())
}

#[tauri::command]
pub async fn get_all_answer_stats(dictionary_id: i64) -> Result<Vec<AnswerStats>, String> {
    let data = sqlx::query_file_as!(
        AnswerStatsDB,
        "./queries/get_all_answer_stats.sql",
        dictionary_id
    )
    .fetch_all(&*DB_POOL)
    .await
    .map_err(|e| e.to_string())?;

    Ok(data.into_iter().map(AnswerStats::from).collect())
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    id: i64,
    key: String,
    username: String,
}

#[tauri::command]
pub async fn get_userdata_by_id(user_id: i64) -> Result<User, String> {
    let data = sqlx::query_file_as!(User, "./queries/get_userdata_by_id.sql", user_id)
        .fetch_optional(&*DB_POOL)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(user) = data {
        Ok(User {
            id: user_id,
            username: user.username,
            key: user.key,
        })
    } else {
        Err(format!("User not found with id: {}", user_id))
    }
}

#[tauri::command]
pub async fn get_all_users() -> Result<Vec<User>, String> {
    let users = sqlx::query_file_as!(User, "./queries/get_all_users.sql")
        .fetch_all(&*DB_POOL)
        .await
        .map_err(|e| e.to_string())?;
    Ok(users)
}
