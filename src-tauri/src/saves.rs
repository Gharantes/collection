use serde::Serialize;
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

// Backups automáticos mantidos por jogo; os manuais nunca são apagados sozinhos.
const KEEP_AUTO: usize = 10;

#[derive(Serialize, Debug)]
pub struct SaveBackup {
    // "<milissegundos>" ou "<milissegundos>-<motivo>" (abrir, restaurar).
    name: String,
    bytes: u64,
}

fn now_millis() -> u128 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis()
}

// Nome gerado por nós: dígitos e, opcionalmente, "-" e letras.
fn valid_name(name: &str) -> bool {
    let (stamp, reason) = name.split_once('-').unwrap_or((name, "a"));
    !stamp.is_empty()
        && stamp.chars().all(|c| c.is_ascii_digit())
        && !reason.is_empty()
        && reason.chars().all(|c| c.is_ascii_lowercase())
}

// Recusa pastas perigosas de apagar: raiz, home e pastas acima da home.
fn safe_target(target: &Path, home: &Path) -> bool {
    let normal = target.components().filter(|c| matches!(c, Component::Normal(_))).count();
    target.is_absolute() && normal >= 3 && !home.starts_with(target)
}

// Copia o conteúdo de `from` para `to`, ignorando links simbólicos.
fn copy_dir(from: &Path, to: &Path) -> std::io::Result<()> {
    fs::create_dir_all(to)?;
    for entry in fs::read_dir(from)? {
        let entry = entry?;
        let kind = entry.file_type()?;
        let dest = to.join(entry.file_name());
        if kind.is_dir() {
            copy_dir(&entry.path(), &dest)?;
        } else if kind.is_file() {
            fs::copy(entry.path(), dest)?;
        }
    }
    Ok(())
}

fn dir_size(dir: &Path) -> u64 {
    fs::read_dir(dir)
        .into_iter()
        .flatten()
        .flatten()
        .map(|e| match e.file_type() {
            Ok(t) if t.is_dir() => dir_size(&e.path()),
            Ok(t) if t.is_file() => e.metadata().map(|m| m.len()).unwrap_or(0),
            _ => 0,
        })
        .sum()
}

fn list(game_dir: &Path) -> Vec<SaveBackup> {
    let mut backups: Vec<SaveBackup> = fs::read_dir(game_dir)
        .into_iter()
        .flatten()
        .flatten()
        .filter_map(|e| {
            let name = e.file_name().into_string().ok()?;
            valid_name(&name).then(|| SaveBackup { bytes: dir_size(&e.path()), name })
        })
        .collect();
    // Mais recente primeiro.
    let stamp = |b: &SaveBackup| b.name.split('-').next().and_then(|s| s.parse::<u128>().ok()).unwrap_or(0);
    backups.sort_by_key(|b| std::cmp::Reverse(stamp(b)));
    backups
}

fn backup(game_dir: &Path, source: &Path, reason: Option<&str>) -> Result<SaveBackup, String> {
    if !source.is_dir() {
        return Err("Pasta de saves não encontrada.".into());
    }
    let name = match reason {
        Some(r) => format!("{}-{r}", now_millis()),
        None => now_millis().to_string(),
    };
    let dest = game_dir.join(&name);
    copy_dir(source, &dest).map_err(|e| e.to_string())?;
    if reason.is_some() {
        prune(game_dir);
    }
    Ok(SaveBackup { bytes: dir_size(&dest), name })
}

// Apaga os automáticos mais antigos além de KEEP_AUTO.
fn prune(game_dir: &Path) {
    for old in list(game_dir).iter().filter(|b| b.name.contains('-')).skip(KEEP_AUTO) {
        let _ = fs::remove_dir_all(game_dir.join(&old.name));
    }
}

fn restore(game_dir: &Path, name: &str, target: &Path, home: &Path) -> Result<(), String> {
    let source = game_dir.join(name);
    if !valid_name(name) || !source.is_dir() {
        return Err("Backup não encontrado.".into());
    }
    if !safe_target(target, home) {
        return Err("Pasta de saves inválida para restaurar.".into());
    }
    if target.is_dir() {
        backup(game_dir, target, Some("restaurar"))?;
        fs::remove_dir_all(target).map_err(|e| e.to_string())?;
    }
    copy_dir(&source, target).map_err(|e| e.to_string())
}

fn game_dir(app: &tauri::AppHandle, game_id: i64) -> Result<PathBuf, String> {
    let root = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(root.join("saves").join(game_id.to_string()))
}

#[tauri::command]
pub fn list_save_backups(app: tauri::AppHandle, game_id: i64) -> Result<Vec<SaveBackup>, String> {
    Ok(list(&game_dir(&app, game_id)?))
}

#[tauri::command]
pub fn backup_saves(
    app: tauri::AppHandle,
    game_id: i64,
    source: String,
    reason: Option<String>,
) -> Result<SaveBackup, String> {
    let reason = reason.filter(|r| valid_name(&format!("0-{r}")));
    backup(&game_dir(&app, game_id)?, Path::new(&source), reason.as_deref())
}

#[tauri::command]
pub fn restore_saves(app: tauri::AppHandle, game_id: i64, name: String, target: String) -> Result<(), String> {
    let home = app.path().home_dir().map_err(|e| e.to_string())?;
    restore(&game_dir(&app, game_id)?, &name, Path::new(&target), &home)
}

#[tauri::command]
pub fn delete_save_backup(app: tauri::AppHandle, game_id: i64, name: String) -> Result<(), String> {
    if !valid_name(&name) {
        return Err("Backup não encontrado.".into());
    }
    fs::remove_dir_all(game_dir(&app, game_id)?.join(name)).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("collection-saves-{}-{name}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn backup_and_restore_roundtrip() {
        let base = temp("roundtrip");
        let home = base.join("home/eu");
        let saves = home.join("Jogo/saves");
        let store = base.join("store");
        fs::create_dir_all(saves.join("slot1")).unwrap();
        fs::write(saves.join("slot1/save.dat"), "fase 3").unwrap();

        let b = backup(&store, &saves, None).unwrap();
        assert_eq!(b.bytes, 6);

        fs::write(saves.join("slot1/save.dat"), "corrompido").unwrap();
        fs::write(saves.join("lixo.tmp"), "x").unwrap();
        restore(&store, &b.name, &saves, &home).unwrap();

        assert_eq!(fs::read_to_string(saves.join("slot1/save.dat")).unwrap(), "fase 3");
        assert!(!saves.join("lixo.tmp").exists());
        assert!(list(&store).iter().any(|x| x.name.ends_with("-restaurar")));
        fs::remove_dir_all(base).unwrap();
    }

    #[test]
    fn refuses_dangerous_targets_and_names() {
        let home = Path::new("/home/eu");
        assert!(!safe_target(Path::new("/"), home));
        assert!(!safe_target(Path::new("/home"), home));
        assert!(!safe_target(home, home));
        assert!(safe_target(Path::new("/home/eu/Jogo"), home));
        assert!(valid_name("1700000000000") && valid_name("1700000000000-abrir"));
        assert!(!valid_name("../x") && !valid_name("123-../x") && !valid_name(""));
    }

    #[test]
    fn keeps_only_recent_automatic_backups() {
        let base = temp("prune");
        let store = base.join("store");
        for i in 0..(KEEP_AUTO + 3) {
            fs::create_dir_all(store.join(format!("{}-abrir", 1000 + i))).unwrap();
        }
        fs::create_dir_all(store.join("999")).unwrap();
        prune(&store);
        let names: Vec<String> = list(&store).into_iter().map(|b| b.name).collect();
        assert_eq!(names.iter().filter(|n| n.contains('-')).count(), KEEP_AUTO);
        assert!(names.contains(&"999".to_string()));
        fs::remove_dir_all(base).unwrap();
    }
}
