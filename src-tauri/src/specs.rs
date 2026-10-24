// Processador e placas de vídeo do PC, para comparar com os requisitos dos jogos.
#[derive(serde::Serialize)]
pub struct Specs {
    cpu: Option<String>,
    gpus: Vec<String>,
}

#[tauri::command]
pub fn system_specs() -> Specs {
    #[cfg(windows)]
    return windows_specs();
    #[cfg(not(windows))]
    Specs { cpu: None, gpus: Vec::new() }
}

// Lidos do registro: o nome do processador e o DriverDesc de cada adaptador na classe "Display".
#[cfg(windows)]
fn windows_specs() -> Specs {
    use winreg::{enums::HKEY_LOCAL_MACHINE, RegKey};
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let cpu = hklm
        .open_subkey(r"HARDWARE\DESCRIPTION\System\CentralProcessor\0")
        .and_then(|key| key.get_value::<String, _>("ProcessorNameString"))
        .ok()
        .map(|name| name.trim().to_string());
    let mut gpus: Vec<String> = Vec::new();
    if let Ok(class) = hklm.open_subkey(
        r"SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}",
    ) {
        for sub in class.enum_keys().flatten() {
            let name = class
                .open_subkey(&sub)
                .and_then(|key| key.get_value::<String, _>("DriverDesc"));
            if let Ok(name) = name {
                let name = name.trim().to_string();
                // Adaptadores virtuais (área de trabalho remota, Hyper-V) não são placas.
                let is_virtual = name.contains("Microsoft") || name.contains("Remote");
                if !is_virtual && !gpus.contains(&name) {
                    gpus.push(name);
                }
            }
        }
    }
    Specs { cpu, gpus }
}
