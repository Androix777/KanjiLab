use crate::get_executable_file_path;
use serde::{Deserialize, Serialize};
use sqlx::{query_file_as, sqlite::SqlitePool};
use std::sync::LazyLock;

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
    examples_count: i64,
) -> Result<Vec<WordWithReadings>, String> {
    const GLOSS_SEPARATOR: &str = "␞";
    const SENSE_SEPARATOR: &str = "␝";
    const KEB_SEPARATOR: &str = "␟";
    const READINGS_SEPARATOR: &str = ",";

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
            match get_reading_with_parts(reading_id, reading, examples_count).await {
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

async fn get_reading_with_parts(reading_id: i64, reading: String, examples_count: i64) -> Result<ReadingWithParts, String> {
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
        "./src/queries/get_word_parts_examples.sql",
        reading_id,
        examples_count
    )
    .fetch_all(&*DB_POOL)
    .await
    .map_err(|e| e.to_string())?;

    let mut parts = Vec::new();

    for raw_part in raw_part_data {
        let words: Vec<&str> = raw_part.top_words.split(',').collect();
        let frequencies: Vec<&str> = raw_part.top_words_frequencies.split(',').collect();
        let readings: Vec<&str> = raw_part.top_words_readings.split(',').collect();

        let examples: Vec<WordPartExample> = words.into_iter()
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
    max_frequency: Option<i64>,
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
pub async fn get_answer_streaks(
    min_frequency: i64,
    max_frequency: i64,
    count: i64,
) -> Result<Vec<AnswerStreaks>, String> {
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
