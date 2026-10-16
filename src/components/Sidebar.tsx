import { useState } from "react";
import { ask, open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { addList, deleteList, exportBackup, restoreBackup, setMembership, type List } from "../db";
import { parseBackup } from "../backup";
import { DRAG_TYPE, type Run } from "./common";

// Lista selecionada, "target" para jogos no preço-alvo, ou null para todos.
export type Filter = number | "target" | null;

type Props = {
  lists: List[];
  filter: Filter;
  setFilter: (f: Filter) => void;
  total: number;
  targetCount: number;
  listCount: (listId: number) => number;
  run: Run;
};

const BACKUP_FILTER = [{ name: "Backup do Collection", extensions: ["json"] }];

export function Sidebar({ lists, filter, setFilter, total, targetCount, listCount, run }: Props) {
  const [dropList, setDropList] = useState<number | null>(null);

  const nav = (f: Filter, label: string, count?: number) => (
    <button className={filter === f ? "nav active" : "nav"} onClick={() => setFilter(f)}>
      <span>{label}</span>
      {count != null && <span className="count">{count}</span>}
    </button>
  );

  const onAddList = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get("name") ?? "").trim();
    if (!name) return;
    run(async () => {
      await addList(name);
      form.reset();
    })();
  };

  const onDeleteList = (list: List) => {
    if (filter === list.id) setFilter(null);
    run(() => deleteList(list.id))();
  };

  const onExport = run(async () => {
    const day = new Date().toISOString().slice(0, 10);
    const path = await save({ defaultPath: `collection-backup-${day}.json`, filters: BACKUP_FILTER });
    if (path) await writeTextFile(path, await exportBackup());
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
    await restoreBackup(backup);
  });

  return (
    <aside className="sidebar">
      <div className="brand">Collection</div>

      <nav>
        {nav(null, "Todos os jogos", total)}
        {nav("target", "No preço-alvo", targetCount)}

        <h3>Listas</h3>
        {lists.map((list) => (
          <div
            key={list.id}
            className={dropList === list.id ? "nav-row drop" : "nav-row"}
            onDragOver={(e) => {
              if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
              e.preventDefault();
              setDropList(list.id);
            }}
            onDragLeave={() => setDropList(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDropList(null);
              const gameId = Number(e.dataTransfer.getData(DRAG_TYPE));
              if (gameId) run(() => setMembership(gameId, list.id, true))();
            }}
          >
            {nav(list.id, list.name, listCount(list.id))}
            <button className="nav-remove" onClick={() => onDeleteList(list)} aria-label={`Apagar lista ${list.name}`}>
              ×
            </button>
          </div>
        ))}
      </nav>

      <form className="new-list" onSubmit={onAddList}>
        <input name="name" placeholder="+ Nova lista" aria-label="Nova lista" required />
      </form>

      <div className="backup">
        <button className="ghost" onClick={onExport} title="Exportar backup">
          Exportar
        </button>
        <button className="ghost" onClick={onImport} title="Importar backup">
          Importar
        </button>
      </div>
    </aside>
  );
}
