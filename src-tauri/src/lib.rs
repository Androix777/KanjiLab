pub mod crypto;
pub mod db;
pub mod fonts;
pub mod tools;
use db::{close_db, init_db};
use tokio::runtime::Runtime;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            tools::get_executable_file_path,
            tools::launch_server,
            tools::stop_server,
            fonts::get_svg_text,
            fonts::get_font_list,
            fonts::get_font_info,
            fonts::get_all_fonts_info,
            db::get_words,
            db::get_stats,
            db::add_answer_stats,
            db::add_game_stats,
            db::get_font_id,
            db::get_answer_streaks,
            db::get_word_parts,
            db::get_word_part_readings,
            db::get_all_game_stats,
            db::get_answer_stats_by_game,
            db::get_all_answer_stats,
            crypto::sign_message,
            crypto::verify_signature,
            crypto::get_accounts,
            crypto::remove_account,
			crypto::rename_account,
            crypto::create_account,
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|_app_handle, event| match event {
            tauri::RunEvent::Ready { .. } => {
                on_ready();
                println!("Ready");
            }
            tauri::RunEvent::Exit {} => {
                on_exit();
                println!("Exit");
            }
            _ => {}
        });
}

fn on_ready() {
    let rt = Runtime::new().unwrap();
    rt.block_on(init_db());
}

fn on_exit() {
    let rt = Runtime::new().unwrap();
    rt.block_on(close_db());
}
