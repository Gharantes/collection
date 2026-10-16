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
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(DB_URL, migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
