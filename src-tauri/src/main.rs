// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![get_executable_file_path])
    .plugin(tauri_plugin_sql::Builder::default().build())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}


#[tauri::command]
fn get_executable_file_path() -> Result<PathBuf, String> {
    match std::env::current_exe() {
        Ok(path) => {
            path.parent()
                .map(PathBuf::from)
                .ok_or_else(|| "Cannot extract parent directory".to_string())
        },
        Err(error) => Err(format!("{error}")),
    }
}
