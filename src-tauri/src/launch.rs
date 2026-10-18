use serde::Serialize;
use std::path::{Path, PathBuf};
use std::process::Child;
use std::time::{Instant, SystemTime, UNIX_EPOCH};
use tauri::{Emitter, Manager};
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

// Biblioteca onde está o appmanifest do jogo.
fn library_of(roots: &[PathBuf], app_id: u32) -> Option<PathBuf> {
    let manifest = format!("appmanifest_{app_id}.acf");
    roots
        .iter()
        .flat_map(|r| libraries(r))
        .find(|lib| lib.join("steamapps").join(&manifest).is_file())
}

fn installed_in(roots: &[PathBuf], app_id: u32) -> bool {
    library_of(roots, app_id).is_some()
}

// Pasta de instalação: steamapps/common/<installdir do appmanifest>.
fn install_dir(roots: &[PathBuf], app_id: u32) -> Option<PathBuf> {
    let lib = library_of(roots, app_id)?;
    let acf = std::fs::read_to_string(lib.join(format!("steamapps/appmanifest_{app_id}.acf"))).ok()?;
    acf.lines().find_map(|line| {
        let parts: Vec<&str> = line.split('"').collect();
        (parts.len() >= 4 && parts[1] == "installdir")
            .then(|| lib.join("steamapps/common").join(parts[3]))
    })
}

#[tauri::command]
pub fn steam_installed(app: tauri::AppHandle, app_id: u32) -> bool {
    let home = app.path().home_dir().unwrap_or_default();
    installed_in(&steam_roots(&home), app_id)
}

// Erro "not_found" quando o jogo não está instalado.
#[tauri::command]
pub fn launch_steam(app: tauri::AppHandle, game_id: i64, app_id: u32) -> Result<(), String> {
    if !steam_installed(app.clone(), app_id) {
        return Err("not_found".into());
    }
    app.opener()
        .open_url(format!("steam://rungameid/{app_id}"), None::<&str>)
        .map_err(|e| e.to_string())?;
    #[cfg(windows)]
    std::thread::spawn(move || watch_steam(app, game_id, app_id));
    #[cfg(not(windows))]
    let _ = game_id;
    Ok(())
}

// A Steam marca HKCU\Software\Valve\Steam\Apps\<id>\Running = 1 enquanto o jogo roda.
#[cfg(windows)]
fn steam_running(app_id: u32) -> bool {
    winreg::RegKey::predef(winreg::enums::HKEY_CURRENT_USER)
        .open_subkey(format!(r"Software\Valve\Steam\Apps\{app_id}"))
        .and_then(|key| key.get_value::<u32, _>("Running"))
        .is_ok_and(|v| v == 1)
}

// Espera o jogo começar (até 10 min, pode ter atualização) e emite "game-exited" quando ele fecha.
#[cfg(windows)]
fn watch_steam(app: tauri::AppHandle, game_id: i64, app_id: u32) {
    use std::time::Duration;
    let tick = Duration::from_secs(5);
    let waiting = Instant::now();
    while !steam_running(app_id) {
        if waiting.elapsed() > Duration::from_secs(600) {
            return;
        }
        std::thread::sleep(tick);
    }
    let started_at = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis();
    let clock = Instant::now();
    while steam_running(app_id) {
        std::thread::sleep(tick);
    }
    let session = Session { game_id, started_at, seconds: clock.elapsed().as_secs() };
    let _ = app.emit("game-exited", session);
}

// Abre a URL no Firefox; se não achar, no navegador padrão.
fn open_in_browser(app: &tauri::AppHandle, url: &str) -> Result<(), String> {
    app.opener()
        .open_url(url, Some("firefox"))
        .or_else(|_| app.opener().open_url(url, None::<&str>))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_store(app: tauri::AppHandle, app_id: u32) -> Result<(), String> {
    open_in_browser(&app, &format!("https://store.steampowered.com/app/{app_id}/"))
}

// Abre um link salvo do jogo; só http e https.
#[tauri::command]
pub fn open_link(app: tauri::AppHandle, url: String) -> Result<(), String> {
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("Link inválido.".into());
    }
    open_in_browser(&app, &url)
}

// Abre a pasta do jogo: a de instalação da Steam ou a do executável.
#[tauri::command]
pub fn open_game_folder(
    app: tauri::AppHandle,
    app_id: Option<u32>,
    exe_path: Option<String>,
) -> Result<(), String> {
    let home = app.path().home_dir().unwrap_or_default();
    let dir = match (exe_path, app_id) {
        (Some(path), _) => Path::new(&path).parent().map(Path::to_path_buf),
        (None, Some(id)) => install_dir(&steam_roots(&home), id),
        _ => None,
    };
    let dir = dir.filter(|d| d.is_dir()).ok_or("not_found")?;
    app.opener()
        .open_path(dir.to_string_lossy(), None::<&str>)
        .map_err(|e| e.to_string())
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Session {
    game_id: i64,
    started_at: u128,
    seconds: u64,
}

// Roda o executável na pasta dele. Erro "not_found" se o arquivo sumiu.
// Também diz se foi aberto como administrador.
fn spawn_exe(path: &str) -> Result<(Child, bool), String> {
    let exe = Path::new(path);
    if !exe.is_file() {
        return Err("not_found".into());
    }
    let dir = exe.parent().unwrap_or(Path::new("."));
    match std::process::Command::new(exe).current_dir(dir).spawn() {
        Ok(child) => Ok((child, false)),
        #[cfg(windows)]
        Err(e) if e.raw_os_error() == Some(740) => spawn_elevated(exe, dir).map(|c| (c, true)),
        Err(e) => Err(e.to_string()),
    }
}

// Jogo que exige administrador (erro 740): o PowerShell pede o UAC e espera o jogo fechar.
#[cfg(windows)]
fn spawn_elevated(exe: &Path, dir: &Path) -> Result<Child, String> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    let quote = |p: &Path| format!("'{}'", p.to_string_lossy().replace('\'', "''"));
    let script = format!(
        "Start-Process -FilePath {} -WorkingDirectory {} -Verb RunAs -Wait",
        quote(exe),
        quote(dir)
    );
    std::process::Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", &script])
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| e.to_string())
}

// Abre o jogo e, quando ele fecha, emite "game-exited" com a duração da sessão.
#[tauri::command]
pub fn launch_exe(app: tauri::AppHandle, game_id: i64, path: String) -> Result<(), String> {
    let (mut child, elevated) = spawn_exe(&path)?;
    let started_at = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis();
    let clock = Instant::now();
    std::thread::spawn(move || {
        let status = child.wait();
        // Com UAC cancelado o PowerShell sai com erro e não houve sessão.
        if elevated && !status.is_ok_and(|s| s.success()) {
            return;
        }
        let session = Session { game_id, started_at, seconds: clock.elapsed().as_secs() };
        let _ = app.emit("game-exited", session);
    });
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
        std::fs::write(
            extra.join("steamapps/appmanifest_42.acf"),
            "\"AppState\"
{
	\"installdir\"		\"Meu Jogo\"
}
",
        )
        .unwrap();

        assert!(installed_in(&[root.clone()], 42));
        assert_eq!(install_dir(&[root.clone()], 42), Some(extra.join("steamapps/common/Meu Jogo")));
        assert!(!installed_in(&[root], 43));
        std::fs::remove_dir_all(base).unwrap();
    }

    #[test]
    fn missing_exe_is_not_found() {
        assert_eq!(spawn_exe("/nao/existe/jogo").err(), Some("not_found".into()));
    }
}
