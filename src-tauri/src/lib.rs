use std::path::PathBuf;
use kanjilab_server;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            get_executable_file_path,
            launch_server,
            stop_server,
			get_svg_text,
        ])
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

#[tauri::command]
async fn launch_server() -> String {
    kanjilab_server::call_launch_server().await;
    kanjilab_server::get_admin_password()
}

#[tauri::command]
async fn stop_server() {
    kanjilab_server::call_stop_server().await;
}

#[tauri::command]
fn get_svg_text(text: &str) -> String {
    use rusttype::{Font, Point};
    use text_svg::Text;
    use std::{fs::File, io::Read};
    use svg::Document;

    let x = 10.;
    let y = 20.;

    let font_path = "x.ttc";
    let mut file = File::open(font_path).unwrap();
    let mut font_data = Vec::new();
    file.read_to_end(&mut font_data).unwrap();
    
    let font = Font::try_from_vec(font_data).unwrap();

    let text = Text::builder()
        .size(100.0)
        .start(Point { x, y })
        .build(&font, text);

    let document = Document::new()
		.set("width", text.bounding_box.max.x + x)
        .set("height", text.bounding_box.max.y + y)
        .add(text.path);

    document.to_string()
}
