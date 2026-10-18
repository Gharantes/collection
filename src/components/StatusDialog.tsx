import { useEffect, useRef, useState } from "react";
import { ask } from "@tauri-apps/plugin-dialog";
import { addStatus, deleteStatus, type StatusDef } from "../db";
import { useStatuses, type Run } from "./common";

type Props = {
  run: Run;
  onClose: () => void;
};

// "Registrar Status": adiciona e apaga opções da lista de status.
export function StatusDialog({ run, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const statuses = useStatuses();
  const [taken, setTaken] = useState<string | null>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const onAdd = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const label = String(new FormData(form).get("label") ?? "").trim();
    if (!label) return;
    if (statuses.some((s) => s.label.toLowerCase() === label.toLowerCase())) return setTaken(label);
    setTaken(null);
    run(async () => {
      await addStatus(label);
      form.reset();
    })();
  };

  const onDelete = (status: StatusDef) =>
    run(async () => {
      const ok = await ask(
        `Apagar o status "${status.label}"? Os jogos com ele ficam sem status e o histórico dele é apagado.`,
        { title: "Registrar Status", kind: "warning" },
      );
      if (ok) await deleteStatus(status.key);
    })();

  return (
    <dialog
      ref={ref}
      className="reset-dialog"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
    >
      <div className="reset-dialog-body">
        <h2>Registrar Status</h2>
        {statuses.length === 0 ? (
          <p>Nenhum status.</p>
        ) : (
          <ul className="status-list">
            {statuses.map((s) => (
              <li key={s.key}>
                <span data-status={s.key}>{s.label}</span>
                <button className="chip-remove" onClick={() => onDelete(s)} aria-label={`Apagar status ${s.label}`}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <form className="status-add" onSubmit={onAdd}>
          <input name="label" placeholder="+ Novo status" aria-label="Novo status" required autoFocus />
        </form>
        {taken && <p className="error-text">Já existe o status "{taken}".</p>}
        <div className="reset-dialog-actions">
          <button type="button" className="ghost" onClick={() => ref.current?.close()}>
            Fechar
          </button>
        </div>
      </div>
    </dialog>
  );
}
