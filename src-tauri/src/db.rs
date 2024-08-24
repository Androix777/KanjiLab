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
pub async fn get_font_id(name: String) -> Result<i64, String> {
    struct RawData {
        id: i64,
    }

    let font_id = sqlx::query_file_as!(RawData, "./src/queries/get_or_create_font.sql", name, name)
        .fetch_one(&*DB_POOL)
        .await
        .map_err(|e| e.to_string())?;

    Ok(font_id.id)
}

#[tauri::command]
pub async fn add_answer_stats(
    game_stats_id: i64,
    word: &str,
    word_reading: &str,
    duration: i64,
    is_correct: bool,
    font_id: i64,
) -> Result<i64, String> {
	struct RawData {
		id: i64,
	}
	
    let result = query_file_as!(
        RawData,
        "./src/queries/add_answer_stats.sql",
        game_stats_id,
        word,
        word_reading,
        duration,
        is_correct,
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
    max_frequency: i64,
    font_id: Option<i64>,
    dictionary_id: i64,
) -> Result<i64, String> {
	struct RawData {
		id: i64,
	}

    let result = sqlx::query_file_as!(
        RawData,
        "./src/queries/add_game_stats.sql",
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
pub async fn get_answer_streaks(min_frequency: i64, max_frequency: i64, count: i64) -> Result<Vec<AnswerStreaks>, String> {
    let data = sqlx::query_file_as!(
			AnswerStreaks, 
			"./src/queries/get_answer_streaks.sql",
			min_frequency,
			max_frequency,
			count
		)
        .fetch_all(&*DB_POOL)
        .await
        .map_err(|e| e.to_string())?;

    Ok(data)
}