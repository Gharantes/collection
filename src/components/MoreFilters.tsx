import type { List, ReleaseStage, Status } from "../db";
import type { Mode } from "../games";
import { useStatuses } from "./common";

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

function RatingSelect({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <select
      className="rating-bound"
      value={value ?? ""}
      onChange={(e) => onChange(e.currentTarget.value === "" ? null : Number(e.currentTarget.value))}
    >
      <option value="">—</option>
      {RATINGS.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </select>
  );
}

export type Extra = {
  lists: Map<number, Mode>;
  statuses: Map<Status, Mode>;
  showEarly: boolean;
  showPre: boolean;
  onlyLinked: boolean;
  minRating: number | null;
  maxRating: number | null;
};

export const NO_EXTRA: Extra = {
  lists: new Map(),
  statuses: new Map(),
  showEarly: true,
  showPre: true,
  onlyLinked: false,
  minRating: null,
  maxRating: null,
};

const RATINGS = Array.from({ length: 11 }, (_, i) => i);

// Com nota mínima ou máxima, jogos sem nota ficam de fora.
export const inRating = (rating: number | null, x: Extra) =>
  (x.minRating == null && x.maxRating == null) ||
  (rating != null && rating >= (x.minRating ?? 0) && rating <= (x.maxRating ?? 10));

// Nas páginas Early Access e Pre-release, os checkboxes ficam fixos: só a da página aparece.
export const withStage = (x: Extra, stage: ReleaseStage | null): Extra =>
  stage ? { ...x, showEarly: stage === "early_access", showPre: stage === "pre_release" } : x;

// Quantos filtros avançados estão ativos (os checkboxes fixos não contam).
export const extraCount = (x: Extra, stage: ReleaseStage | null) =>
  x.lists.size +
  x.statuses.size +
  Number(x.minRating != null) +
  Number(x.maxRating != null) +
  Number(x.onlyLinked) +
  (stage ? 0 : Number(!x.showEarly) + Number(!x.showPre));

// Seção "Mais filtros": listas e status com incluir/exigir/excluir, só vinculados e mostrar Early Access/Pre-release.
export function MoreFilters({
  lists,
  stage,
  extra,
  setExtra,
}: {
  lists: List[];
  stage: ReleaseStage | null;
  extra: Extra;
  setExtra: (x: Extra) => void;
}) {
  const shown = withStage(extra, stage);
  const statuses = useStatuses();
  return (
    <div className="more-filters">
      <div className="more-row">
        <span className="muted">Status</span>
        <ModeChips
          items={statuses.map((s) => ({ key: s.key, label: s.label }))}
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
        <span className="muted">Nota</span>
        <label className="check">
          Mínima
          <RatingSelect value={extra.minRating} onChange={(minRating) => setExtra({ ...extra, minRating })} />
        </label>
        <label className="check">
          Máxima
          <RatingSelect value={extra.maxRating} onChange={(maxRating) => setExtra({ ...extra, maxRating })} />
        </label>
      </div>
      <div className="more-row">
        <span className="muted">Vínculo</span>
        <label className="check" title="Jogos com Steam ou executável">
          <input
            type="checkbox"
            checked={extra.onlyLinked}
            onChange={(e) => setExtra({ ...extra, onlyLinked: e.currentTarget.checked })}
          />
          Só vinculados
        </label>
      </div>
      <div className="more-row">
        <span className="muted">Release</span>
        <label className="check">
          <input
            type="checkbox"
            checked={shown.showEarly}
            disabled={stage != null}
            onChange={(e) => setExtra({ ...extra, showEarly: e.currentTarget.checked })}
          />
          Mostrar Early Access
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={shown.showPre}
            disabled={stage != null}
            onChange={(e) => setExtra({ ...extra, showPre: e.currentTarget.checked })}
          />
          Mostrar Pre-release
        </label>
        {extraCount(extra, stage) > 0 && (
          <button className="ghost clear-filters" onClick={() => setExtra(NO_EXTRA)}>
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  );
}
