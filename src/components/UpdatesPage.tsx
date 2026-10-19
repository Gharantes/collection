import type { PriceChange } from "../games";

// Uma atualização que encontrou mudanças.
export type UpdateRun = { at: number; changes: PriceChange[] };

type Props = {
  runs: UpdateRun[];
  lastAt: number;
  refreshing: boolean;
  exists: (gameId: number) => boolean;
  onRefresh: () => void;
  onOpen: (gameId: number) => void;
};

const when = (ms: number) => new Date(ms).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function UpdatesPage({ runs, lastAt, refreshing, exists, onRefresh, onOpen }: Props) {
  return (
    <div className="updates">
      <div className="updates-head">
        <button className="update-button" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? "Atualizando…" : "Atualizar Dados"}
        </button>
        <span className="muted">{lastAt ? `Última atualização: ${when(lastAt)}` : "Nunca atualizado"}</span>
      </div>

      {runs.length === 0 ? (
        <p className="empty">Nenhuma mudança encontrada ainda.</p>
      ) : (
        runs.map((r) => (
          <section key={r.at} className="update-run">
            <h3>{when(r.at)}</h3>
            <ul>
              {r.changes.map((c, i) => (
                <li key={i} className={`update-change ${c.kind}`}>
                  {exists(c.gameId) ? (
                    <button className="update-game" onClick={() => onOpen(c.gameId)}>
                      {c.name}
                    </button>
                  ) : (
                    <span>{c.name}</span>
                  )}
                  <span>{c.text}</span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
