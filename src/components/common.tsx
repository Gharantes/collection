import { useState } from "react";
import { setMembership, setRating, setStatus, type Game, type List, type Status } from "../db";
import { discount, money, ratingTier } from "../games";

// Ação do App: roda, recarrega tudo e mostra erro na tela.
export type Run = (action: () => Promise<unknown>) => () => Promise<void>;

export const STATUSES: Record<Status, string> = {
  backlog: "Backlog",
  playing: "Jogando",
  finished: "Terminado",
  abandoned: "Abandonado",
};

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
export function Cover({ game }: { game: Game }) {
  const [broken, setBroken] = useState(false);
  if (game.steam_id != null && !broken) {
    return <img className="poster" src={portrait(game.steam_id)} alt="" onError={() => setBroken(true)} />;
  }
  return (
    <div className="poster fallback">
      {game.image_url && <img src={game.image_url} alt="" />}
      <span>{game.name}</span>
    </div>
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
  return (
    <select
      className="pill"
      data-status={game.status ?? ""}
      value={game.status ?? ""}
      onChange={(e) => {
        const v = e.currentTarget.value as Status | "";
        run(() => setStatus(game.id, v || null))();
      }}
      aria-label="Status"
    >
      <option value="">—</option>
      {Object.entries(STATUSES).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
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

type ListChipsProps = { game: Game; lists: List[]; inList: (gameId: number, listId: number) => boolean; run: Run };

// Listas do jogo com × para tirar, e menu "+ Lista" com as que faltam.
export function ListChips({ game, lists, inList, run }: ListChipsProps) {
  const missing = lists.filter((list) => !inList(game.id, list.id));
  return (
    <div className="chips">
      {lists
        .filter((list) => inList(game.id, list.id))
        .map((list) => (
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
      {missing.length > 0 && (
        <select
          className="add-list"
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
