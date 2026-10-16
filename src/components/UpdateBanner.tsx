import { useEffect, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import type { Run } from "./common";

// Procura versão nova nas releases do GitHub e oferece atualizar e reiniciar.
export function UpdateBanner({ run }: { run: Run }) {
  const [update, setUpdate] = useState<Update | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (!import.meta.env.DEV) check().then(setUpdate).catch(() => {});
  }, []);

  if (!update) return null;

  const install = run(async () => {
    setInstalling(true);
    try {
      await update.downloadAndInstall();
      await relaunch();
    } finally {
      setInstalling(false);
    }
  });

  return (
    <div className="update">
      <span>
        Versão <strong>{update.version}</strong> disponível.
      </span>
      <button onClick={install} disabled={installing}>
        {installing ? "Atualizando…" : "Atualizar e reiniciar"}
      </button>
    </div>
  );
}
