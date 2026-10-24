mod launch;
mod saves;

const DB_URL: &str = "sqlite:collection.db";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        tauri_plugin_sql::Migration {
            version: 1,
            description: "create games, lists and game_lists",
            sql: include_str!("../migrations/001_init.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 2,
            description: "add games.steam_id",
            sql: include_str!("../migrations/002_steam_id.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 3,
            description: "add games.status",
            sql: include_str!("../migrations/003_status.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 4,
            description: "add games.image_url, price and currency",
            sql: include_str!("../migrations/004_image_price.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 5,
            description: "add games.price_initial",
            sql: include_str!("../migrations/005_price_initial.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 6,
            description: "add games.notes",
            sql: include_str!("../migrations/006_notes.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 7,
            description: "add games.launch and exe_path",
            sql: include_str!("../migrations/007_launch.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 8,
            description: "create status_events",
            sql: include_str!("../migrations/008_status_events.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 9,
            description: "add games.target_price and target_discount",
            sql: include_str!("../migrations/009_price_alerts.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 10,
            description: "add games.save_path",
            sql: include_str!("../migrations/010_save_path.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 11,
            description: "create play_sessions",
            sql: include_str!("../migrations/011_play_sessions.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 12,
            description: "add status abandoned",
            sql: include_str!("../migrations/012_abandoned.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 13,
            description: "create game_notes",
            sql: include_str!("../migrations/013_game_notes.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 14,
            description: "add game_notes.image",
            sql: include_str!("../migrations/014_note_image.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 15,
            description: "add games.release_stage and release_date",
            sql: include_str!("../migrations/015_release.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 16,
            description: "add games.achievements",
            sql: include_str!("../migrations/016_achievements.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 17,
            description: "games.achievements becomes hunting or platinum",
            sql: include_str!("../migrations/017_achievements_platinum.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 18,
            description: "create statuses",
            sql: include_str!("../migrations/018_statuses.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 19,
            description: "create saved_filters",
            sql: include_str!("../migrations/019_saved_filters.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 20,
            description: "create game_links",
            sql: include_str!("../migrations/020_game_links.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 21,
            description: "add games.owned",
            sql: include_str!("../migrations/021_owned.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 22,
            description: "add games.demo_steam_id",
            sql: include_str!("../migrations/022_demo.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
        tauri_plugin_sql::Migration {
            version: 23,
            description: "add games.news",
            sql: include_str!("../migrations/023_news.sql"),
            kind: tauri_plugin_sql::MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(DB_URL, migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            launch::steam_installed,
            launch::launch_steam,
            launch::launch_exe,
            launch::open_store,
            launch::open_link,
            launch::open_game_folder,
            saves::list_save_backups,
            saves::backup_saves,
            saves::restore_saves,
            saves::delete_save_backup
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
