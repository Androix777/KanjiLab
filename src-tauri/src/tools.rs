use std::path::PathBuf;

#[tauri::command]
pub fn get_executable_file_path() -> Result<PathBuf, String> {
    match std::env::current_exe() {
        Ok(path) => path
            .parent()
            .map(PathBuf::from)
            .ok_or_else(|| "Cannot extract parent directory".to_string()),
        Err(error) => Err(format!("{error}")),
    }
}

#[tauri::command]
pub async fn launch_server() -> String {
    kanjilab_server::call_launch_server().await;
    kanjilab_server::get_admin_password()
}

#[tauri::command]
pub async fn stop_server() {
    kanjilab_server::call_stop_server().await;
}
