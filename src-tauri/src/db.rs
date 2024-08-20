use crate::get_executable_file_path;
use serde::{Deserialize, Serialize};
use sqlx::{query_file_as, sqlite::SqlitePool};
use std::{collections::HashMap, sync::LazyLock};

static DB_POOL: LazyLock<SqlitePool> = LazyLock::new(|| {
    let path_str = get_executable_file_path()
        .unwrap()
        .join("words.db")
        .into_os_string()
        .into_string()
        .unwrap();
    SqlitePool::connect_lazy(&path_str).unwrap()
});

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Reading {
    id: i64,
    reading: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WordWithReadings {
    id: i64,
    word: String,
    readings: Vec<Reading>,
}

#[tauri::command]
pub async fn get_words(
    count: u32,
    min_frequency: u32,
    max_frequency: u32,
    word_part: Option<&str>,
) -> Result<Vec<WordWithReadings>, String> {
    #[derive(Debug, Deserialize)]
    struct RawData {
        word_id: i64,
        word: String,
        reading_id: i64,
        word_reading: String,
    }

    let raw_data = if let Some(part) = word_part {
        query_file_as!(
            RawData,
            "./src/queries/get_words_with_parts.sql",
            count,
            min_frequency,
            max_frequency,
            part
        )
        .fetch_all(&*DB_POOL)
        .await
        .map_err(|e| e.to_string())?
    } else {
        query_file_as!(
            RawData,
            "./src/queries/get_words.sql",
            count,
            min_frequency,
            max_frequency
        )
        .fetch_all(&*DB_POOL)
        .await
        .map_err(|e| e.to_string())?
    };

    let mut word_map: HashMap<i64, WordWithReadings> = HashMap::new();

    for raw_word in raw_data {
        word_map
            .entry(raw_word.word_id)
            .or_insert_with(|| WordWithReadings {
                id: raw_word.word_id,
                word: raw_word.word.clone(),
                readings: Vec::new(),
            })
            .readings
            .push(Reading {
                id: raw_word.reading_id,
                reading: raw_word.word_reading,
            });
    }

    let result: Vec<WordWithReadings> = word_map.into_values().collect();

    Ok(result)
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatsInfo {
    correct_count: i64,
    wrong_count: i64,
}

#[tauri::command]
pub async fn get_stats() -> Result<StatsInfo, String> {
    let data = query_file_as!(StatsInfo, "./src/queries/get_stats.sql")
        .fetch_one(&*DB_POOL)
        .await
        .map_err(|e| e.to_string())?;

    Ok(data)
}

#[tauri::command]
pub async fn add_answer_result(
    word: &str,
    word_reading: Option<&str>,
	is_correct: bool,
) -> Result<(), String> {
    query_file_as!(
        StatsInfo,
        "./src/queries/add_answer_result.sql",
        word,
        word_reading,
		is_correct,
    )
    .execute(&*DB_POOL)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}
