import { useEffect, useRef, useState } from "react";
import { ask } from "@tauri-apps/plugin-dialog";
import { addList, deleteList, type List } from "../db";
import type { Run } from "./common";

type Props = {
  lists: List[];
  listCount: (listId: number) => number;
  run: Run;
  onClose: () => void;
};

// "Registrar Listas": adiciona e apaga listas.
export function ListDialog({ lists, listCount, run, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [taken, setTaken] = useState<string | null>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const onAdd = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get("name") ?? "").trim();
    if (!name) return;
    if (lists.some((l) => l.name.toLowerCase() === name.toLowerCase())) return setTaken(name);
    setTaken(null);
    run(async () => {
      await addList(name);
      form.reset();
    })();
  };

  const onDelete = (list: List) =>
    run(async () => {
      const ok = await ask(`Apagar a lista "${list.name}"? Os jogos continuam na biblioteca.`, {
        title: "Registrar Listas",
        kind: "warning",
      });
      if (ok) await deleteList(list.id);
    })();

  return (
    <dialog
      ref={ref}
      className="reset-dialog"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
    >
      <div className="reset-dialog-body">
        <h2>Registrar Listas</h2>
        {lists.length === 0 ? (
          <p>Nenhuma lista.</p>
        ) : (
          <ul className="status-list">
            {lists.map((l) => (
              <li key={l.id}>
                <span>
                  {l.name} <span className="count">{listCount(l.id)}</span>
                </span>
                <button className="chip-remove" onClick={() => onDelete(l)} aria-label={`Apagar lista ${l.name}`}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <form className="status-add" onSubmit={onAdd}>
          <input name="name" placeholder="+ Nova lista" aria-label="Nova lista" required autoFocus />
        </form>
        {taken && <p className="error-text">Já existe a lista "{taken}".</p>}
        <div className="reset-dialog-actions">
          <button type="button" className="ghost" onClick={() => ref.current?.close()}>
            Fechar
          </button>
        </div>
      </div>
    </dialog>
  );
}
