import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ask, open } from "@tauri-apps/plugin-dialog";
import { setSavePath, type Game } from "../db";
import { formatBytes } from "../games";

type SaveBackup = { name: string; bytes: number };
type Run = (action: () => Promise<unknown>) => () => Promise<void>;

// Nome do backup ("<ms>" ou "<ms>-<motivo>") para data legível.
const describe = (name: string) => {
  const [stamp, reason] = name.split("-");
  const when = new Date(Number(stamp)).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  return { when, reason: reason ? "automático" : "manual" };
};

// Pasta de saves do jogo e a lista de backups dela.
export function SavesPanel({ game, run }: { game: Game; run: Run }) {
  const [backups, setBackups] = useState<SaveBackup[]>([]);

  const refresh = async () => setBackups(await invoke<SaveBackup[]>("list_save_backups", { gameId: game.id }));

  useEffect(() => {
    refresh().catch(() => setBackups([]));
  }, [game]);

  // Roda a ação pelo `run` do App e atualiza a lista mesmo se falhar.
  const act = (action: () => Promise<unknown>) =>
    run(async () => {
      try {
        await action();
      } finally {
        await refresh();
      }
    })();

  const choose = () =>
    act(async () => {
      const path = await open({ directory: true, title: "Escolha a pasta de saves do jogo" });
      if (path) await setSavePath(game.id, path);
    });

  const backupNow = () => act(() => invoke("backup_saves", { gameId: game.id, source: game.save_path }));

  const restore = (name: string) =>
    act(async () => {
      const ok = await ask(
        `Substituir a pasta de saves pelo backup de ${describe(name).when}? O conteúdo atual da pasta será perdido.`,
        { title: "Restaurar saves", kind: "warning" },
      );
      if (ok) await invoke("restore_saves", { gameId: game.id, name, target: game.save_path });
    });

  const remove = (name: string) => act(() => invoke("delete_save_backup", { gameId: game.id, name }));

  return (
    <div className="detail-saves">
      <h3>Saves</h3>
      {!game.save_path ? (
        <div className="saves-head">
          <button className="ghost" onClick={choose}>
            Escolher pasta de saves
          </button>
          <span className="muted">Depois, faça backups quando quiser.</span>
        </div>
      ) : (
        <>
          <div className="saves-head">
            <code className="save-path" title={game.save_path}>
              {game.save_path}
            </code>
            <button className="ghost" onClick={choose}>
              Trocar pasta
            </button>
            <button onClick={backupNow}>Fazer backup agora</button>
          </div>
          {backups.length === 0 ? (
            <p className="muted">Nenhum backup ainda.</p>
          ) : (
            <ul className="backups">
              {backups.map((b) => {
                const d = describe(b.name);
                return (
                  <li key={b.name}>
                    <span>{d.when}</span>
                    <span className="muted grow">
                      {d.reason} · {formatBytes(b.bytes)}
                    </span>
                    <button className="ghost" onClick={() => restore(b.name)}>
                      Restaurar
                    </button>
                    <button
                      className="chip-remove"
                      onClick={() => remove(b.name)}
                      aria-label={`Apagar backup de ${d.when}`}
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
