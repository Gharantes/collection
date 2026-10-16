use std::path::{Path, PathBuf};
use tauri::Manager;
use tauri_plugin_opener::OpenerExt;

// Pastas onde a Steam costuma ficar instalada, em cada sistema.
fn steam_roots(home: &Path) -> Vec<PathBuf> {
    let mut roots = vec![
        home.join(".steam/steam"),
        home.join(".local/share/Steam"),
        home.join(".var/app/com.valvesoftware.Steam/.local/share/Steam"),
        home.join("snap/steam/common/.local/share/Steam"),
        home.join("Library/Application Support/Steam"),
        PathBuf::from(r"C:\Program Files (x86)\Steam"),
        PathBuf::from(r"C:\Program Files\Steam"),
    ];
    roots.retain(|r| r.is_dir());
    roots
}

// A pasta da Steam mais as bibliotecas extras de libraryfolders.vdf.
fn libraries(root: &Path) -> Vec<PathBuf> {
    let mut libs = vec![root.to_path_buf()];
    if let Ok(vdf) = std::fs::read_to_string(root.join("steamapps/libraryfolders.vdf")) {
        for line in vdf.lines() {
            let parts: Vec<&str> = line.split('"').collect();
            if parts.len() >= 4 && parts[1] == "path" {
                libs.push(PathBuf::from(parts[3].replace("\\\\", "\\")));
            }
        }
    }
    libs
}

fn installed_in(roots: &[PathBuf], app_id: u32) -> bool {
    let manifest = format!("appmanifest_{app_id}.acf");
    roots
        .iter()
        .flat_map(|r| libraries(r))
        .any(|lib| lib.join("steamapps").join(&manifest).is_file())
}

#[tauri::command]
pub fn steam_installed(app: tauri::AppHandle, app_id: u32) -> bool {
    let home = app.path().home_dir().unwrap_or_default();
    installed_in(&steam_roots(&home), app_id)
}

// Erro "not_found" quando o jogo não está instalado.
#[tauri::command]
pub fn launch_steam(app: tauri::AppHandle, app_id: u32) -> Result<(), String> {
    if !steam_installed(app.clone(), app_id) {
        return Err("not_found".into());
    }
    app.opener()
        .open_url(format!("steam://rungameid/{app_id}"), None::<&str>)
        .map_err(|e| e.to_string())
}

// Roda o executável na pasta dele. Erro "not_found" se o arquivo sumiu.
#[tauri::command]
pub fn launch_exe(path: String) -> Result<(), String> {
    let exe = Path::new(&path);
    if !exe.is_file() {
        return Err("not_found".into());
    }
    let mut child = std::process::Command::new(exe)
        .current_dir(exe.parent().unwrap_or(Path::new(".")))
        .spawn()
        .map_err(|e| e.to_string())?;
    std::thread::spawn(move || child.wait());
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_game_in_extra_library() {
        let base = std::env::temp_dir().join(format!("collection-steam-{}", std::process::id()));
        let root = base.join("Steam");
        let extra = base.join("Games");
        std::fs::create_dir_all(root.join("steamapps")).unwrap();
        std::fs::create_dir_all(extra.join("steamapps")).unwrap();
        let vdf = format!(
            "\"libraryfolders\"\n{{\n\t\"1\"\n\t{{\n\t\t\"path\"\t\t\"{}\"\n\t}}\n}}\n",
            extra.display()
        );
        std::fs::write(root.join("steamapps/libraryfolders.vdf"), vdf).unwrap();
        std::fs::write(extra.join("steamapps/appmanifest_42.acf"), "").unwrap();

        assert!(installed_in(&[root.clone()], 42));
        assert!(!installed_in(&[root], 43));
        std::fs::remove_dir_all(base).unwrap();
    }

    #[test]
    fn missing_exe_is_not_found() {
        assert_eq!(launch_exe("/nao/existe/jogo".into()), Err("not_found".into()));
    }
}
