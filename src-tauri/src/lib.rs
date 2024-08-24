pub mod db;
use std::{
    fs::{self, File},
    io::Read,
    panic::{self, AssertUnwindSafe},
    path::PathBuf,
};
use ttf_parser::{name_id, Face};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            get_executable_file_path,
            launch_server,
            stop_server,
            get_svg_text,
            get_font_list,
            get_font_info,
            get_all_fonts_info,
            db::get_words,
            db::get_stats,
            db::add_answer_stats,
            db::add_game_stats,
            db::get_font_id,
			db::get_answer_streaks,
        ])
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
        return Err(format!(
            "The font '{}' lacks the necessary characters.",
            font_name
        ));
    }

    let x = 25.;
    let y = 25.;

    let result = panic::catch_unwind(AssertUnwindSafe(|| {
        Text::builder()
            .size(100.0)
            .start(Point { x, y })
            .build(&font, text)
    }));

    let text = match result {
        Ok(text) => text,
        Err(_panic_error) => {
            return Err(format!(
                "The font '{}' lacks the necessary characters.",
                font_name
            ));
        }
    };

    let document = Document::new()
        .set("width", text.bounding_box.max.x + x)
        .set("height", text.bounding_box.max.y + y)
        .add(text.path);

    Ok(document.to_string())
}

#[tauri::command]
fn get_font_list() -> Result<Vec<String>, String> {
    let exe_path = get_executable_file_path()?;
    let fonts_dir = exe_path.join("fonts");

    let font_list = fs::read_dir(fonts_dir)
        .map_err(|e| format!("Failed to read fonts directory: {}", e))?
        .filter_map(|entry| entry.ok().and_then(|e| e.file_name().into_string().ok()))
        .collect::<Vec<String>>();

    Ok(font_list)
}

#[tauri::command]
fn get_font_info(font_name: &str) -> Result<FontInfo, String> {
    let exe_path = get_executable_file_path()?;
    let fonts_dir = exe_path.join("fonts");
    let font_path = fonts_dir.join(font_name);

    if !font_path.exists() {
        return Err(format!("Font file '{}' not found", font_name));
    }

    let mut file = File::open(&font_path)
        .map_err(|e| format!("Failed to open font file '{}': {}", font_name, e))?;

    let mut font_data = Vec::new();
    file.read_to_end(&mut font_data)
        .map_err(|e| format!("Failed to read font file '{}': {}", font_name, e))?;

    let face = Face::parse(&font_data, 0)
        .map_err(|e| format!("Failed to parse font data from '{}': {:?}", font_name, e))?;

    let get_name = |id| {
        face.names()
            .into_iter()
            .filter(|name| name.name_id == id)
            .find_map(|name| name.to_string())
            .unwrap_or_else(|| "".to_string())
    };

    let f = FontInfo {
        font_file: font_name.to_string(),
        copyright_notice: get_name(name_id::COPYRIGHT_NOTICE),
        family: get_name(name_id::FAMILY),
        subfamily: get_name(name_id::SUBFAMILY),
        unique_id: get_name(name_id::UNIQUE_ID),
        full_name: get_name(name_id::FULL_NAME),
        version: get_name(name_id::VERSION),
        post_script_name: get_name(name_id::POST_SCRIPT_NAME),
        trademark: get_name(name_id::TRADEMARK),
        manufacturer: get_name(name_id::MANUFACTURER),
        designer: get_name(name_id::DESIGNER),
        description: get_name(name_id::DESCRIPTION),
        vendor_url: get_name(name_id::VENDOR_URL),
        designer_url: get_name(name_id::DESIGNER_URL),
        license: get_name(name_id::LICENSE),
        license_url: get_name(name_id::LICENSE_URL),
        typographic_family: get_name(name_id::TYPOGRAPHIC_FAMILY),
        typographic_subfamily: get_name(name_id::TYPOGRAPHIC_SUBFAMILY),
        compatible_full: get_name(name_id::COMPATIBLE_FULL),
        sample_text: get_name(name_id::SAMPLE_TEXT),
        post_script_cid: get_name(name_id::POST_SCRIPT_CID),
        wws_family: get_name(name_id::WWS_FAMILY),
        wws_subfamily: get_name(name_id::WWS_SUBFAMILY),
        light_background_palette: get_name(name_id::LIGHT_BACKGROUND_PALETTE),
        dark_background_palette: get_name(name_id::DARK_BACKGROUND_PALETTE),
        variations_post_script_name_prefix: get_name(name_id::VARIATIONS_POST_SCRIPT_NAME_PREFIX),
        num_glyphs: face.number_of_glyphs(),
        units_per_em: face.units_per_em(),
    };

    Ok(f)
}

#[tauri::command]
fn get_all_fonts_info() -> Result<Vec<FontInfo>, String> {
    let font_list = get_font_list()?;
    let mut all_fonts_info = Vec::new();

    for font_name in font_list {
        match get_font_info(&font_name) {
            Ok(font_info) => all_fonts_info.push(font_info),
            Err(e) => eprintln!("Error getting info for font '{}': {}", font_name, e),
        }
    }

    Ok(all_fonts_info)
}

#[derive(serde::Serialize, Debug)]
#[serde(rename_all = "camelCase")]
struct FontInfo {
    font_file: String,
    copyright_notice: String,
    family: String,
    subfamily: String,
    unique_id: String,
    full_name: String,
    version: String,
    post_script_name: String,
    trademark: String,
    manufacturer: String,
    designer: String,
    description: String,
    vendor_url: String,
    designer_url: String,
    license: String,
    license_url: String,
    typographic_family: String,
    typographic_subfamily: String,
    compatible_full: String,
    sample_text: String,
    post_script_cid: String,
    wws_family: String,
    wws_subfamily: String,
    light_background_palette: String,
    dark_background_palette: String,
    variations_post_script_name_prefix: String,
    num_glyphs: u16,
    units_per_em: u16,
}
