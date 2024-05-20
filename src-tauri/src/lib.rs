use std::path::PathBuf;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![get_executable_file_path])
        .plugin(tauri_plugin_sql::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn get_executable_file_path() -> Result<PathBuf, String> {
    match std::env::current_exe() {
        Ok(path) => path
            .parent()
            .map(PathBuf::from)
            .ok_or_else(|| "Cannot extract parent directory".to_string()),
        Err(error) => Err(format!("{error}")),
    }
}
