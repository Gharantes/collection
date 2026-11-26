import { useEffect, useRef, useState } from "react";
import { ask } from "@tauri-apps/plugin-dialog";
import {
  addStatus,
  deleteStatus,
  getNoStatusChecks,
  setNoStatusCheck,
  setStatusCheck,
  type StatusCheck,
  type StatusChecks,
  type StatusDef,
} from "../db";
import { useStatuses, type Run } from "./common";

// Etapas do "Atualizar Dados" que cada status pode ligar ou desligar. Preço é por jogo ("Quero comprar").
const CHECKS: { key: StatusCheck; label: string; title: string }[] = [
  {
    key: "check_releases",
    label: "EA / Pre-release",
    title: "Saída de Early Access/Pre-release e release date",
  },
  { key: "check_demos", label: "Demos", title: "Ganhou ou perdeu demo" },
];

type Props = {
  run: Run;
  onClose: () => void;
};

// "Registrar Status": adiciona e apaga opções da lista de status.
export function StatusDialog({ run, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const statuses = useStatuses();
  const [taken, setTaken] = useState<string | null>(null);
  const [none, setNone] = useState<StatusChecks | null>(null);

  useEffect(() => {
    ref.current?.showModal();
    getNoStatusChecks().then(setNone);
  }, []);

  const onNoneCheck = (check: StatusCheck, on: boolean) =>
    run(async () => {
      await setNoStatusCheck(check, on);
      setNone((n) => n && { ...n, [check]: on ? 1 : 0 });
    })();

  const onAdd = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const label = String(new FormData(form).get("label") ?? "").trim();
    if (!label) return;
    if (statuses.some((s) => s.label.toLowerCase() === label.toLowerCase()))
      return setTaken(label);
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
      className="reset-dialog status-dialog"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
    >
      <div className="reset-dialog-body">
        <h2>Registrar Status</h2>
        <>
          <p className="status-hint">
            O "Atualizar Dados" confere, nos jogos de cada status:
          </p>
          <ul className="status-list">
            <li className="status-head" aria-hidden>
              <span />
              {CHECKS.map((c) => (
                <span key={c.key} title={c.title}>
                  {c.label}
                </span>
              ))}
              <span />
            </li>
            {none && (
              <li className="status-none">
                <span>Sem status</span>
                {CHECKS.map((c) => (
                  <input
                    key={c.key}
                    type="checkbox"
                    className="switch"
                    checked={!!none[c.key]}
                    onChange={(e) => onNoneCheck(c.key, e.target.checked)}
                    title={`${c.title}: ${none[c.key] ? "confere" : "ignora"}`}
                    aria-label={`${c.title} nos jogos sem status`}
                  />
                ))}
                <span />
              </li>
            )}
            {statuses.map((s) => (
              <li key={s.key}>
                <span data-status={s.key}>{s.label}</span>
                {CHECKS.map((c) => (
                  <input
                    key={c.key}
                    type="checkbox"
                    className="switch"
                    checked={!!s[c.key]}
                    onChange={(e) =>
                      run(() =>
                        setStatusCheck(s.key, c.key, e.target.checked),
                      )()
                    }
                    title={`${c.title}: ${s[c.key] ? "confere" : "ignora"}`}
                    aria-label={`${c.title} nos jogos ${s.label}`}
                  />
                ))}
                <button
                  className="chip-remove"
                  onClick={() => onDelete(s)}
                  aria-label={`Apagar status ${s.label}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </>
        <form className="status-add" onSubmit={onAdd}>
          <input
            name="label"
            placeholder="+ Novo status"
            aria-label="Novo status"
            required
            autoFocus
          />
        </form>
        {taken && <p className="error-text">Já existe o status "{taken}".</p>}
        <div className="reset-dialog-actions">
          <button
            type="button"
            className="ghost"
            onClick={() => ref.current?.close()}
          >
            Fechar
          </button>
        </div>
      </div>
    </dialog>
  );
}
