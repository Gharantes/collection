import { createContext, useContext, useState } from "react";
import { setMembership, setRating, setStatus, type Game, type List, type StatusDef } from "../db";
import { discount, money, ratingTier } from "../games";

// Ação do App: roda, recarrega tudo e mostra erro na tela.
export type Run = (action: () => Promise<unknown>) => () => Promise<void>;

// Status registrados (tabela statuses), carregados pelo App.
export const StatusesContext = createContext<StatusDef[]>([]);
export const useStatuses = () => useContext(StatusesContext);

// Nome de cada status pela chave.
export const useStatusLabels = () => Object.fromEntries(useStatuses().map((s) => [s.key, s.label]));

const RATINGS = Array.from({ length: 11 }, (_, i) => i);

export const DRAG_TYPE = "application/x-collection-game";

// Torna o elemento arrastável levando o id do jogo.
export const dragGame = (gameId: number) => ({
  draggable: true,
  onDragStart: (e: React.DragEvent) => {
    e.dataTransfer.setData(DRAG_TYPE, String(gameId));
    e.dataTransfer.effectAllowed = "copy";
  },
});

// Capa vertical da biblioteca da Steam.
const portrait = (steamId: number) =>
  `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${steamId}/library_600x900.jpg`;

// Capa vertical; sem capa, mostra a imagem pequena e o nome.
// Faixa de erro com botão para fechar.
export function ErrorBanner({ error, onClose }: { error: string | null; onClose: () => void }) {
  if (!error) return null;
  return (
    <p className="error">
      <span>{error}</span>
      <button className="ghost" onClick={onClose} aria-label="Fechar">
        ×
      </button>
    </p>
  );
}

export function Cover({ game }: { game: Game }) {
  const [broken, setBroken] = useState(false);
  if (game.steam_id != null && !broken) {
    return (
      <img
        className="poster"
        src={portrait(game.steam_id)}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <div className="poster fallback">
      {game.image_url && <img src={game.image_url} alt="" loading="lazy" decoding="async" />}
      <span>{game.name}</span>
    </div>
  );
}

// Contorno em pétalas da roseta (estrela de 16 pontas arredondada pelo stroke).
const ROSETTE = Array.from({ length: 32 }, (_, i) => {
  const r = i % 2 ? 13.5 : 16;
  const a = (i * Math.PI) / 16;
  return `${(20 + r * Math.sin(a)).toFixed(2)},${(18 - r * Math.cos(a)).toFixed(2)}`;
}).join(" ");

// Medalha de conquistas, como a da Steam: dourada se platinado, cinza se ainda caçando a platina.
export function Medal({ game }: { game: Game }) {
  if (!game.achievements) return null;
  const done = game.achievements === "platinum";
  const label = done ? "Platinado" : "Caçando platina";
  return (
    <svg className={done ? "medal gold" : "medal"} viewBox="0 0 40 48" role="img" aria-label={label}>
      <title>{label}</title>
      <path className="ribbon" d="M12 24l-6 20 6-4 4 6 6-20zM28 24l6 20-6-4-4 6-6-20z" />
      <polygon className="rosette" points={ROSETTE} />
      <circle className="center" cx="20" cy="18" r="9" />
    </svg>
  );
}

// Preço atual; em promoção mostra também o original riscado e o desconto.
export function Price(p: { final: number | null; initial: number | null; currency: string | null }) {
  const off = discount(p.initial, p.final);
  if (!off) return <span className="price muted">{money(p.final, p.currency)}</span>;
  return (
    <span className="price">
      <span className="sale">-{off}%</span>
      <s className="muted">{money(p.initial, p.currency)}</s>
      <span className="sale-price">{money(p.final, p.currency)}</span>
    </span>
  );
}

export function StatusSelect({ game, run }: { game: Game; run: Run }) {
  const statuses = useStatuses();
  return (
    <select
      className="pill"
      data-status={game.status ?? ""}
      value={game.status ?? ""}
      onChange={(e) => {
        const v = e.currentTarget.value;
        run(() => setStatus(game.id, v || null))();
      }}
      aria-label="Status"
    >
      <option value="">—</option>
      {statuses.map((s) => (
        <option key={s.key} value={s.key}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

export function RatingSelect({ game, run }: { game: Game; run: Run }) {
  return (
    <select
      className="pill"
      data-tier={ratingTier(game.rating)}
      value={game.rating ?? ""}
      onChange={(e) => {
        const v = e.currentTarget.value;
        run(() => setRating(game.id, v === "" ? null : Number(v)))();
      }}
      aria-label="Nota"
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

type ListChipsProps = {
  game: Game;
  lists: List[];
  inList: (gameId: number, listId: number) => boolean;
  run: Run;
  // Quantas listas mostrar antes de esconder o resto atrás de "+N".
  max?: number;
};

// Listas do jogo com × para tirar, e menu "+ Lista" com as que faltam.
export function ListChips({ game, lists, inList, run, max = Infinity }: ListChipsProps) {
  const [expanded, setExpanded] = useState(false);
  const missing = lists.filter((list) => !inList(game.id, list.id));
  const member = lists.filter((list) => inList(game.id, list.id));
  // Só esconde se sobrar mais de uma, para "+1" não ocupar o lugar da própria lista.
  const collapsible = member.length > max + 1;
  const hidden = collapsible && !expanded ? member.slice(max) : [];
  const shown = hidden.length ? member.slice(0, max) : member;
  return (
    <div className="chips">
      {shown.map((list) => (
          <span key={list.id} className="chip">
            {list.name}
            <button
              className="chip-remove"
              onClick={run(() => setMembership(game.id, list.id, false))}
              aria-label={`Tirar ${game.name} de ${list.name}`}
            >
              ×
            </button>
          </span>
        ))}
      {collapsible && (
        <button
          className="chip chip-more"
          onClick={() => setExpanded(!expanded)}
          title={hidden.map((list) => list.name).join(", ")}
        >
          {expanded ? "menos" : `+${hidden.length}`}
        </button>
      )}
      {missing.length > 0 && (
        <select
          className="pill add-list"
          value=""
          onChange={(e) => run(() => setMembership(game.id, Number(e.currentTarget.value), true))()}
          aria-label={`Adicionar ${game.name} a uma lista`}
        >
          <option value="" disabled>
            + Lista
          </option>
          {missing.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
