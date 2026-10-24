import { useState } from "react";
import type { List } from "../db";
import { NO_EXTRA, extraCount, type Extra, type ReleaseKey } from "../filters";
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

const RATINGS = Array.from({ length: 11 }, (_, i) => i);

const STAGES: { key: ReleaseKey; label: string }[] = [
  { key: "released", label: "Lançado" },
  { key: "early_access", label: "Early Access" },
  { key: "pre_release", label: "Pre-release" },
  { key: "demo", label: "Possui demo" },
];

// Seção "Mais filtros": listas, status e release com incluir/exigir/excluir, só vinculados, notícias
// e salvar o filtro atual com um nome (um nome que já existe troca o filtro dele).
export function MoreFilters({
  lists,
  extra,
  setExtra,
  onSave,
}: {
  lists: List[];
  extra: Extra;
  setExtra: (x: Extra) => void;
  onSave: (name: string) => void;
}) {
  const statuses = useStatuses();
  const [saveName, setSaveName] = useState("");
  return (
    <div className="more-filters">
      <div className="more-row">
        <span className="muted">Salvar</span>
        <form
          className="save-filter"
          onSubmit={(e) => {
            e.preventDefault();
            const name = saveName.trim();
            if (!name) return;
            onSave(name);
            setSaveName("");
          }}
        >
          <input
            value={saveName}
            onChange={(e) => setSaveName(e.currentTarget.value)}
            placeholder="Nome do filtro"
            aria-label="Nome do filtro"
          />
          <button type="submit" className="ghost" disabled={!saveName.trim()}>
            Salvar filtro atual
          </button>
        </form>
      </div>
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
        <span className="muted">Notícias</span>
        <select
          value={extra.news == null ? "" : String(extra.news)}
          onChange={(e) => {
            const v = e.currentTarget.value;
            setExtra({ ...extra, news: v === "" ? null : v === "true" });
          }}
          aria-label="Buscar notícias"
        >
          <option value="">Todos</option>
          <option value="true">Buscando notícias</option>
          <option value="false">Sem buscar notícias</option>
        </select>
      </div>
      <div className="more-row">
        <span className="muted">Release</span>
        <ModeChips items={STAGES} modes={extra.stages} setModes={(stages) => setExtra({ ...extra, stages })} />
        {extraCount(extra) > 0 && (
          <button className="ghost clear-filters" onClick={() => setExtra(NO_EXTRA)}>
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  );
}
