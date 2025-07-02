// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tracing_subscriber::{
    filter::Targets,
    fmt::{self, format::FmtSpan, time::LocalTime},
    prelude::*,
};

fn main() {
    setup_tracing();
    app_lib::run();
}

pub fn setup_tracing() {
    let filter = Targets::new()
        .with_target("kanjilab_server", tracing::Level::DEBUG)
        .with_default(tracing::Level::INFO);

    let time_fmt = LocalTime::new(time::macros::format_description!(
        "[hour]:[minute]:[second].[subsecond digits:3]"
    ));

    tracing_subscriber::registry()
        .with(
            fmt::layer()
                .with_target(false)
                .with_timer(time_fmt)
                .with_span_events(FmtSpan::CLOSE)
                .with_filter(filter),
        )
        .init();
}
