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
pub fn launch_server(host_port: String) -> Result<(), String> {
    kanjilab_server::call_launch_server(host_port)
}

#[tauri::command]
pub fn stop_server() -> Result<(), String> {
    kanjilab_server::call_stop_server()
}
