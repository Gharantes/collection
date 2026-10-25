import { useEffect, useRef, useState } from "react";
import { ask, message, open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { exportBackup, type BackupProgress, mergeDemos, resetLibrary, restoreBackup, type List, type SavedFilter } from "../db";
import { parseBackup } from "../backup";
import type { Run } from "./common";
import { BackupDialog, type BackupJob } from "./BackupDialog";
import { ListDialog } from "./ListDialog";
import { ResetDialog } from "./ResetDialog";
import { StatusDialog } from "./StatusDialog";

// "target" (jogos no preço-alvo), "stats" (estatísticas), "updates" (atualizações) ou null (todos).
export type Filter = "target" | "stats" | "updates" | null;

type Props = {
  lists: List[];
  savedFilters: SavedFilter[];
  // Filtro salvo igual ao atual, marcado na sidebar.
  activeSaved: number | null;
  onLoadSaved: (f: SavedFilter) => void;
  onDeleteSaved: (f: SavedFilter) => void;
  filter: Filter;
  setFilter: (f: Filter) => void;
  total: number;
  targetCount: number;
  listCount: (listId: number) => number;
  run: Run;
};

const BACKUP_FILTER = [{ name: "Backup do Collection", extensions: ["json"] }];

export function Sidebar({ lists, savedFilters, activeSaved, onLoadSaved, onDeleteSaved, filter, setFilter, total, targetCount, listCount, run }: Props) {
  const [editingLists, setEditingLists] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [editingStatuses, setEditingStatuses] = useState(false);
  const [backupJob, setBackupJob] = useState<BackupJob | null>(null);
  const settings = useRef<HTMLDetailsElement>(null);

  // Fecha o menu de configurações ao clicar fora dele.
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (settings.current && !settings.current.contains(e.target as Node)) settings.current.open = false;
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const fromMenu = (action: () => void) => () => {
    settings.current!.open = false;
    action();
  };

  // "Todos os jogos" não fica marcado quando um filtro salvo está.
  const nav = (f: Filter, label: string, count?: number) => (
    <button className={filter === f && (f !== null || activeSaved == null) ? "nav active" : "nav"} onClick={() => setFilter(f)}>
      <span>{label}</span>
      {count != null && <span className="count">{count}</span>}
    </button>
  );

  // Roda exportar/importar mostrando a barra de progresso; no fim o dialog diz se deu certo.
  const withProgress = async (title: string, work: (progress: BackupProgress) => Promise<string>) => {
    const progress: BackupProgress = (label, done, total) => setBackupJob({ title, label, done, total });
    progress("Começando", 0, 1);
    try {
      setBackupJob({ title, label: "", done: 1, total: 1, result: { ok: true, text: await work(progress) } });
    } catch (e) {
      const text = e instanceof Error ? e.message : String(e);
      setBackupJob({ title, label: "", done: 0, total: 1, result: { ok: false, text: `Falhou: ${text}` } });
    }
  };

  const onExport = run(async () => {
    const day = new Date().toISOString().slice(0, 10);
    const path = await save({ defaultPath: `collection-backup-${day}.json`, filters: BACKUP_FILTER });
    if (!path) return;
    await withProgress("Exportar backup", async (progress) => {
      const text = await exportBackup(progress);
      progress("Salvando arquivo", 0, 1);
      await writeTextFile(path, text);
      return `Backup salvo em ${path}.`;
    });
  });

  const onImport = run(async () => {
    const path = await open({ multiple: false, directory: false, filters: BACKUP_FILTER });
    if (!path) return;
    const backup = parseBackup(await readTextFile(path));
    const ok = await ask(
      `Isso substitui todos os jogos e listas atuais pelos do backup (${backup.games.length} jogos). Continuar?`,
      { title: "Importar backup", kind: "warning" },
    );
    if (!ok) return;
    setFilter(null);
    await withProgress("Importar backup", async (progress) => {
      await restoreBackup(backup, progress);
      return `Backup importado (${backup.games.length} jogos).`;
    });
  });

  // Junta as páginas de demo com as do jogo completo; apaga páginas, então pede confirmação.
  const onMergeDemos = run(async () => {
    const ok = await ask(
      "Procura na Steam as páginas que são demo e junta cada uma com a do jogo completo (tempo de jogo, anotações, links e listas). " +
        "Se o jogo completo não estiver na biblioteca, a página da demo vira a dele. Exporte um backup antes. Continuar?",
      { title: "Juntar demos", kind: "warning" },
    );
    if (!ok) return;
    await withProgress("Juntar demos", mergeDemos);
  });

  // Procura versão nova nas releases do GitHub e oferece atualizar e reiniciar.
  const onCheckUpdate = run(async () => {
    const update = await check();
    if (!update) {
      await message("Você já está na versão mais recente.", { title: "Atualizações" });
      return;
    }
    const ok = await ask(`Versão ${update.version} disponível. Atualizar e reiniciar agora?`, { title: "Atualizações" });
    if (!ok) return;
    await update.downloadAndInstall();
    await relaunch();
  });

  const onReset = run(async () => {
    setFilter(null);
    await resetLibrary();
  });

  return (
    <aside className="sidebar">
      <div className="brand">Collection</div>

      <nav>
        {nav(null, "Todos os jogos", total)}
        {nav("target", "No preço-alvo", targetCount)}
        {nav("stats", "Estatísticas")}
        {nav("updates", "Atualizações")}

        <h3>Filtros salvos</h3>
        {savedFilters.length === 0 && <p className="sidebar-hint">Salve um em "Mais filtros".</p>}
        {savedFilters.map((f) => {
          const on = filter === null && f.id === activeSaved;
          return (
            <div key={f.id} className="nav-row">
              <button
                className={on ? "nav active" : "nav"}
                onClick={() => onLoadSaved(f)}
                title={on ? "Limpar o filtro" : "Carregar este filtro"}
              >
                <span>{f.name}</span>
              </button>
              <button className="nav-remove" onClick={() => onDeleteSaved(f)} aria-label={`Apagar filtro ${f.name}`}>
                ×
              </button>
            </div>
          );
        })}
      </nav>

      <details className="menu settings" ref={settings}>
        <summary>Configurações</summary>
        <div className="menu-items">
          <button onClick={fromMenu(onExport)}>Exportar backup</button>
          <button onClick={fromMenu(onImport)}>Importar backup</button>
          <button onClick={fromMenu(() => setEditingLists(true))}>Registrar Listas</button>
          <button onClick={fromMenu(() => setEditingStatuses(true))}>Registrar Status</button>
          <button onClick={fromMenu(onMergeDemos)}>Juntar demos</button>
          <button onClick={fromMenu(onCheckUpdate)}>Procurar atualizações</button>
          <button className="menu-danger" onClick={fromMenu(() => setResetting(true))}>
            Resetar biblioteca
          </button>
        </div>
      </details>
      {resetting && <ResetDialog onConfirm={onReset} onClose={() => setResetting(false)} />}
      {editingLists && <ListDialog lists={lists} listCount={listCount} run={run} onClose={() => setEditingLists(false)} />}
      {editingStatuses && <StatusDialog run={run} onClose={() => setEditingStatuses(false)} />}
      {backupJob && <BackupDialog job={backupJob} onClose={() => setBackupJob(null)} />}
    </aside>
  );
}
