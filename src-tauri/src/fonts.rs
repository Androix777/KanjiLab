use crate::tools::get_executable_file_path;
use fontdb::{Database, FaceInfo, Language, Source, ID};
use indexmap::IndexMap;
use std::{
    fs,
    sync::{Arc, LazyLock},
};
use ttf_parser::{name_id, Face};
use usvg::*;

static FONT_MANAGER: LazyLock<FontManager> = LazyLock::new(|| {
    let exe_path = get_executable_file_path()
        .map_err(|e| e.to_string())
        .unwrap();
    FontManager::new(exe_path.join("fonts"))
});

pub struct FontManager {
    embedded_fonts: IndexMap<String, &'static [u8]>,
    fonts_dir: std::path::PathBuf,
}

impl FontManager {
    pub fn new(fonts_dir: std::path::PathBuf) -> Self {
        let mut embedded_fonts = IndexMap::new();

        embedded_fonts.insert(
            "NotoSansJP-Regular.ttf".to_string(),
            include_bytes!("../fonts/NotoSansJP-Regular.ttf") as &'static [u8],
        );

        Self {
            embedded_fonts,
            fonts_dir,
        }
    }

    fn create_face_info(&self, source: Source, family: String) -> FaceInfo {
        FaceInfo {
            id: ID::dummy(),
            source,
            index: 0,
            families: vec![(family, Language::English_UnitedStates)],
            post_script_name: "".to_owned(),
            style: fontdb::Style::Normal,
            weight: fontdb::Weight(400),
            stretch: fontdb::Stretch::Normal,
            monospaced: false,
        }
    }

    pub fn get_font_database(&self, font_name: &str) -> Result<Database, String> {
        let mut db = Database::new();

        if let Some(font_data) = self.embedded_fonts.get(font_name) {
            let face = self.create_face_info(
                Source::Binary(Arc::new(font_data.to_vec())),
                "requested-font".to_owned(),
            );
            db.push_face_info(face);
            return Ok(db);
        }

        let font_path = self.fonts_dir.join(font_name);
        if !font_path.exists() {
            return Err(format!("Font '{}' not found", font_name));
        }

        let face = self.create_face_info(Source::File(font_path), "requested-font".to_owned());
        db.push_face_info(face);
        Ok(db)
    }

    pub fn get_font_info(&self, font_name: &str) -> Result<FontInfo, String> {
        let font_data = if let Some(embedded_data) = self.embedded_fonts.get(font_name) {
            embedded_data.to_vec()
        } else {
            let font_path = self.fonts_dir.join(font_name);
            std::fs::read(&font_path).map_err(|e| format!("Failed to read font file: {}", e))?
        };

        let face =
            Face::parse(&font_data, 0).map_err(|e| format!("Failed to parse font: {:?}", e))?;

        let get_name = |id| {
            face.names()
                .into_iter()
                .filter(|name| name.name_id == id)
                .find_map(|name| name.to_string())
                .unwrap_or_default()
        };

        Ok(FontInfo {
            font_file: font_name.to_string(),
            is_embedded: self.embedded_fonts.contains_key(font_name),
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
            variations_post_script_name_prefix: get_name(
                name_id::VARIATIONS_POST_SCRIPT_NAME_PREFIX,
            ),
            num_glyphs: face.number_of_glyphs(),
            units_per_em: face.units_per_em(),
        })
    }

    pub fn get_all_fonts_info(&self) -> Result<Vec<FontInfo>, String> {
        let mut all_fonts = Vec::new();

        for font_name in self.embedded_fonts.keys() {
            if let Ok(info) = self.get_font_info(font_name) {
                all_fonts.push(info);
            }
        }

        if let Ok(entries) = std::fs::read_dir(&self.fonts_dir) {
            for entry in entries.filter_map(Result::ok) {
                if let Some(font_name) = entry.file_name().to_str() {
                    if self.embedded_fonts.contains_key(font_name) {
                        continue;
                    }
                    if let Ok(info) = self.get_font_info(font_name) {
                        all_fonts.push(info);
                    }
                }
            }
        }

        Ok(all_fonts)
    }

    pub fn get_font_list(&self) -> Result<Vec<String>, String> {
        let mut font_list: Vec<String> =
            self.embedded_fonts.keys().map(|s| s.to_string()).collect();

        if let Ok(entries) = fs::read_dir(&self.fonts_dir) {
            for entry in entries.filter_map(Result::ok) {
                if let Ok(filename) = entry.file_name().into_string() {
                    if !self.embedded_fonts.contains_key(&filename) {
                        font_list.push(filename);
                    }
                }
            }
        }

        Ok(font_list)
    }

    pub fn check_font_support(&self, font_name: &str, text: &str) -> Result<bool, String> {
        let font_data = if let Some(embedded_data) = self.embedded_fonts.get(font_name) {
            embedded_data.to_vec()
        } else {
            let font_path = self.fonts_dir.join(font_name);
            std::fs::read(&font_path).map_err(|e| format!("Failed to read font file: {}", e))?
        };

        let face =
            Face::parse(&font_data, 0).map_err(|e| format!("Failed to parse font: {:?}", e))?;

        for c in text.chars() {
            if let Some(glyph_id) = face.glyph_index(c) {
                if face.glyph_bounding_box(glyph_id).is_none() {
                    return Ok(false);
                }
            } else {
                return Ok(false);
            }
        }

        Ok(true)
    }
}

#[tauri::command]
pub fn get_svg_text(text: &str, font_name: &str) -> Result<String, String> {
    let fontdb = if !font_name.is_empty()
        && FONT_MANAGER
            .check_font_support(font_name, text)
            .is_ok_and(|x| x)
    {
        FONT_MANAGER.get_font_database(font_name)?
    } else {
        FONT_MANAGER.get_font_database("NotoSansJP-Regular.ttf")?
    };

    let opt = Options {
        fontdb: Arc::new(fontdb),
        ..Options::default()
    };

    let temp_svg = format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5000 5000">
            <text x="2500" y="2500" font-family="requested-font" font-size="300" 
                  text-anchor="middle" dominant-baseline="middle">{}</text>
        </svg>"#,
        text
    );

    let temp_tree =
        Tree::from_str(&temp_svg, &opt).map_err(|e| format!("Failed to parse SVG: {}", e))?;
    let bbox = temp_tree.root().bounding_box();

    let final_svg = format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}">
            <text x="{x}" y="{y}" font-family="requested-font" font-size="300" text-anchor="middle" dominant-baseline="middle">{text}</text>
        </svg>"#,
        width = bbox.width().ceil(),
        height = bbox.height().ceil(),
        x = 2500.0 - bbox.left(),
        y = 2500.0 - bbox.top(),
        text = text
    );
    let final_tree = Tree::from_str(&final_svg, &opt)
        .map_err(|e| format!("Failed to parse final SVG: {}", e))?;

    let write_options = WriteOptions {
        preserve_text: false,
        ..Default::default()
    };

    Ok(final_tree.to_string(&write_options))
}

#[tauri::command]
pub fn get_font_list() -> Result<Vec<String>, String> {
    FONT_MANAGER.get_font_list()
}

#[tauri::command]
pub fn get_font_info(font_name: &str) -> Result<FontInfo, String> {
    FONT_MANAGER.get_font_info(font_name)
}

#[tauri::command]
pub fn get_all_fonts_info() -> Result<Vec<FontInfo>, String> {
    FONT_MANAGER.get_all_fonts_info()
}

#[derive(serde::Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FontInfo {
    font_file: String,
    is_embedded: bool,
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
