import type { List, Status } from "../db";
import type { Mode } from "../games";
import { STATUSES } from "./common";

const NEXT: Record<"none" | Mode, Mode | null> = {
  none: "include",
  include: "require",
  require: "exclude",
  exclude: null,
};

const MODE_LABEL: Record<Mode, string> = {
  include: "incluir",
  require: "exigir",
  exclude: "excluir",
};

// Chips que alternam a cada clique: neutro → incluir → exigir → excluir; botão direito limpa.
function ModeChips<K>({
  items,
  modes,
  setModes,
}: {
  items: { key: K; label: string }[];
  modes: Map<K, Mode>;
  setModes: (m: Map<K, Mode>) => void;
}) {
  const set = (key: K, mode: Mode | null) => {
    const next = new Map(modes);
    if (mode) next.set(key, mode);
    else next.delete(key);
    setModes(next);
  };
  return (
    <div className="chips">
      {items.map(({ key, label }) => {
        const mode = modes.get(key);
        return (
          <button
            key={String(key)}
            className={`mode-chip ${mode ?? ""}`}
            onClick={() => set(key, NEXT[mode ?? "none"])}
            onContextMenu={(e) => {
              e.preventDefault();
              set(key, null);
            }}
            title="Clique: incluir → exigir → excluir. Botão direito: limpar."
          >
            {label}
            {mode && <span className="mode-tag">{MODE_LABEL[mode]}</span>}
          </button>
        );
      })}
    </div>
  );
}

export type Extra = {
  lists: Map<number, Mode>;
  statuses: Map<Status, Mode>;
  showEarly: boolean;
  showPre: boolean;
};

export const NO_EXTRA: Extra = { lists: new Map(), statuses: new Map(), showEarly: true, showPre: true };

// Quantos filtros avançados estão ativos.
export const extraCount = (x: Extra) => x.lists.size + x.statuses.size + Number(!x.showEarly) + Number(!x.showPre);

// Seção "Mais filtros": listas e status com incluir/exigir/excluir, e mostrar Early Access/Pre-release.
export function MoreFilters({ lists, extra, setExtra }: { lists: List[]; extra: Extra; setExtra: (x: Extra) => void }) {
  return (
    <div className="more-filters">
      <div className="more-row">
        <span className="muted">Status</span>
        <ModeChips
          items={(Object.keys(STATUSES) as Status[]).map((s) => ({ key: s, label: STATUSES[s] }))}
          modes={extra.statuses}
          setModes={(statuses) => setExtra({ ...extra, statuses })}
        />
      </div>
      <div className="more-row">
        <span className="muted">Listas</span>
        {lists.length === 0 ? (
          <span className="muted">Nenhuma lista.</span>
        ) : (
          <ModeChips
            items={lists.map((l) => ({ key: l.id, label: l.name }))}
            modes={extra.lists}
            setModes={(m) => setExtra({ ...extra, lists: m })}
          />
        )}
      </div>
      <div className="more-row">
        <span className="muted">Release</span>
        <label className="check">
          <input
            type="checkbox"
            checked={extra.showEarly}
            onChange={(e) => setExtra({ ...extra, showEarly: e.currentTarget.checked })}
          />
          Mostrar Early Access
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={extra.showPre}
            onChange={(e) => setExtra({ ...extra, showPre: e.currentTarget.checked })}
          />
          Mostrar Pre-release
        </label>
        {extraCount(extra) > 0 && (
          <button className="ghost clear-filters" onClick={() => setExtra(NO_EXTRA)}>
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  );
}
