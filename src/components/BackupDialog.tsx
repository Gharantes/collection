import { useEffect, useRef } from "react";

// Andamento de exportar/importar backup. `result` só aparece quando acabou (deu certo ou não).
export type BackupJob = {
  title: string;
  label: string;
  done: number;
  total: number;
  result?: { ok: boolean; text: string };
};

// Barra de progresso do backup. Não fecha enquanto roda; no fim avisa se já pode fechar o app.
export function BackupDialog({ job, onClose }: { job: BackupJob; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const finished = !!job.result;

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="reset-dialog"
      onClose={onClose}
      onCancel={(e) => !finished && e.preventDefault()}
    >
      <div className="reset-dialog-body">
        <h2>{job.title}</h2>
        {!finished ? (
          <>
            <div className="update-progress-text">
              <span>{job.label}</span>
              <span className="muted">
                {job.done}/{job.total}
              </span>
            </div>
            <div
              className="update-progress-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={job.total}
              aria-valuenow={job.done}
            >
              <div style={{ width: `${job.total ? (job.done / job.total) * 100 : 0}%` }} />
            </div>
            <p>Não feche o app até terminar.</p>
          </>
        ) : (
          <p className={job.result!.ok ? undefined : "error-text"}>{job.result!.text}</p>
        )}
        <div className="reset-dialog-actions">
          <button type="button" disabled={!finished} onClick={() => ref.current?.close()}>
            {finished ? "OK" : "Aguarde…"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
