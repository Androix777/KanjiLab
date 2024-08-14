use kanjilab_server;
use std::{fs, path::PathBuf};

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
fn get_svg_text(text: &str, font_name: &str) -> Result<String, String> {
    use rusttype::{Font, Point};
    use std::{fs::File, io::Read, path::PathBuf};
    use svg::Document;
    use text_svg::Text;

    fn can_render_string(font: &Font, text: &str) -> bool {
        text.chars().all(|c| font.glyph(c).id().0 != 0)
    }

    let exe_path = get_executable_file_path()?;
    let fonts_dir = exe_path.join("fonts");

    let font_path: PathBuf = fonts_dir.join(font_name);

    if !font_path.exists() {
        return Err(format!("Font file '{}' not found", font_name));
    }

    let mut file = File::open(&font_path)
        .map_err(|e| format!("Failed to open font file '{}': {}", font_name, e))?;
    
    let mut font_data = Vec::new();
    file.read_to_end(&mut font_data)
        .map_err(|e| format!("Failed to read font file '{}': {}", font_name, e))?;

    let font = Font::try_from_vec(font_data)
        .ok_or_else(|| format!("Failed to parse font data from '{}'", font_name))?;

    if !can_render_string(&font, text) {
        return Err(format!("The font '{}' lacks the necessary characters.", font_name));
    }
	
    let x = 25.;
    let y = 25.;

    let text = Text::builder()
        .size(100.0)
        .start(Point { x, y })
        .build(&font, text);

    let document = Document::new()
        .set("width", text.bounding_box.max.x + x)
        .set("height", text.bounding_box.max.y + y)
        .add(text.path);

    Ok(document.to_string())
}
