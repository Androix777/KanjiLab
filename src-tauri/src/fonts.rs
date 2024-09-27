use crate::tools::get_executable_file_path;
use fontdb::{Database, FaceInfo, Language, Source, ID};
use std::{
    fs::{self, File},
    io::Read,
    sync::Arc,
};
use ttf_parser::{name_id, Face};
use usvg::*;

#[tauri::command]
pub fn get_svg_text(text: &str, font_name: &str) -> Result<String, String> {
    const DEFAULT_FONT: &[u8] = include_bytes!("../NotoSansJP-Regular.ttf");

    let create_face_info = |source: Source, family: String| FaceInfo {
        id: ID::dummy(),
        source,
        index: 0,
        families: vec![(family, Language::English_UnitedStates)],
        post_script_name: "".to_owned(),
        style: fontdb::Style::Normal,
        weight: fontdb::Weight(400),
        stretch: fontdb::Stretch::Normal,
        monospaced: false,
    };

    let exe_path = get_executable_file_path().map_err(|e| e.to_string())?;
    let fonts_dir = exe_path.join("fonts");

    let mut fontdb = Database::new();

    let specified_font_path = fonts_dir.join(font_name);
    if !specified_font_path.exists() {
        return Err(format!(
            "Font file '{}' not found.",
            specified_font_path.display()
        ));
    }
    let specified_face = create_face_info(Source::File(specified_font_path), "kanjilab".to_owned());
    fontdb.push_face_info(specified_face);
    let default_face = create_face_info(
        Source::Binary(Arc::new(DEFAULT_FONT.to_vec())),
        "kanjilab-default".to_owned(),
    );
    fontdb.push_face_info(default_face);

    let opt = Options {
        fontdb: Arc::new(fontdb),
        ..Options::default()
    };

    let generate_svg = |font_families: &str| {
        format!(
            r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5000 5000">
                <text x="2500" y="2500" font-family="{}" font-size="300" text-anchor="middle" dominant-baseline="middle">{}</text>
            </svg>"#,
            font_families, text
        )
    };

    let initial_font_families = "kanjilab, kanjilab-default";
    let mut svg_data = generate_svg(initial_font_families);
    let mut tree =
        Tree::from_str(&svg_data, &opt).map_err(|e| format!("Failed to parse SVG: {}", e))?;
    let mut bbox = tree.root().bounding_box();
    let mut font_families = initial_font_families;

    if bbox.width() == 0.0 {
        font_families = "kanjilab-default";
        svg_data = generate_svg(font_families);

        tree = Tree::from_str(&svg_data, &opt)
            .map_err(|e| format!("Failed to parse SVG with default font: {}", e))?;
        bbox = tree.root().bounding_box();
    }

    let final_svg = format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}">
            <text x="{x}" y="{y}" font-family="{families}" font-size="300" text-anchor="middle" dominant-baseline="middle">{text}</text>
        </svg>"#,
        width = bbox.width().ceil(),
        height = bbox.height().ceil(),
        x = 2500.0 - bbox.left(),
        y = 2500.0 - bbox.top(),
        families = font_families,
        text = text
    );

    let final_tree = Tree::from_str(&final_svg, &opt)
        .map_err(|e| format!("Failed to parse final SVG: {}", e))?;

    let write_options = WriteOptions {
        preserve_text: false,
        ..Default::default()
    };
    let result_svg = final_tree.to_string(&write_options);

    Ok(result_svg)
}

#[tauri::command]
pub fn get_font_list() -> Result<Vec<String>, String> {
    let exe_path = get_executable_file_path()?;
    let fonts_dir = exe_path.join("fonts");

    let font_list = fs::read_dir(fonts_dir)
        .map_err(|e| format!("Failed to read fonts directory: {}", e))?
        .filter_map(|entry| entry.ok().and_then(|e| e.file_name().into_string().ok()))
        .collect::<Vec<String>>();

    Ok(font_list)
}

#[tauri::command]
pub fn get_font_info(font_name: &str) -> Result<FontInfo, String> {
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
pub fn get_all_fonts_info() -> Result<Vec<FontInfo>, String> {
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
pub struct FontInfo {
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
