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
fn get_svg_text(text: &str) -> Result<String, String> {
    use rand::seq::SliceRandom;
    use rusttype::{Font, Point};
    use std::{fs::File, io::Read};
    use svg::Document;
    use text_svg::Text;

    fn can_render_string(font: &Font, text: &str) -> bool {
        text.chars().all(|c| can_render_char(font, c))
    }

    fn can_render_char(font: &Font, c: char) -> bool {
        font.glyph(c).id().0 != 0
    }

    let x = 10.;
    let y = 20.;

    let exe_path = get_executable_file_path()?;
    let fonts_dir = exe_path.join("fonts");

    let mut font_files = Vec::new();
    let mut failed_fonts = Vec::new();

    let entries =
        fs::read_dir(&fonts_dir).map_err(|_| "Failed to read fonts directory".to_string())?;

    for entry in entries {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let path = entry.path();
        let ext = path.extension().and_then(|e| e.to_str());

        if !matches!(ext, Some("ttf" | "otf" | "ttc")) {
            continue;
        }

        match File::open(&path) {
            Ok(_) => font_files.push(path),
            Err(_) => {
                if let Some(file_name) = path.file_name() {
                    failed_fonts.push(file_name.to_string_lossy().into_owned());
                }
            }
        }
    }

    if !failed_fonts.is_empty() {
        println!("Failed to load the following fonts: {:?}", failed_fonts);
    }

    if font_files.is_empty() {
        return Err("No valid font files found in the fonts directory".to_string());
    }

    let font_path = font_files
        .choose(&mut rand::thread_rng())
        .ok_or("Failed to choose a random font")?;

    let mut file = File::open(font_path).map_err(|e| format!("Failed to open font file: {}", e))?;
    let mut font_data = Vec::new();
    file.read_to_end(&mut font_data)
        .map_err(|e| format!("Failed to read font file: {}", e))?;

    let font = Font::try_from_vec(font_data).ok_or("Failed to parse font data")?;

    if !can_render_string(&font, text) {
        return Err("The font lacks the necessary characters.".to_string());
    }

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
