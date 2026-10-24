import { useEffect, useRef } from "react";
import type { Game, List } from "../db";
import { COLUMNS, type Column } from "../filters";
import { formatRelease } from "../games";
import { ListChips, Medal, Price, RatingSelect, StageBand, StatusSelect, dragGame, useBatches, type Run } from "./common";

type Props = {
  games: Game[];
  // Colunas mostradas além da imagem e do nome.
  columns: Column[];
  lists: List[];
  inList: (gameId: number, listId: number) => boolean;
  run: Run;
  onDelete: (game: Game) => void;
  onOpen: (id: number) => void;
};

export function GameTable({ games, columns, lists, inList, run, onDelete, onOpen }: Props) {
  const { visible, more } = useBatches(games);
  const show = new Set(columns);
  return (
    <>
      <table className="games">
        <thead>
          <tr>
            <th />
            <th>Jogo</th>
            {show.has("price") && <th>Preço</th>}
            {show.has("release") && <th>Release Date</th>}
            {show.has("status") && <th>Status</th>}
            {show.has("rating") && <th>Nota</th>}
            {show.has("lists") && <th>Listas</th>}
            {show.has("remove") && <th />}
          </tr>
        </thead>
        <tbody>
          {visible.map((game) => (
            <tr
              key={game.id}
              className={game.owned ? undefined : "not-owned"}
              {...dragGame(game.id)}
              onClick={(e) => {
                // Cliques nos controles da linha (selects, chips, botões) não abrem o detalhe.
                if (!(e.target as HTMLElement).closest("button, select, input, a, label")) onOpen(game.id);
              }}
            >
              <td className="cover-cell">
                <Medal game={game} />
                {game.image_url ? (
                  <img className="cover" src={game.image_url} alt="" />
                ) : (
                  <div className="cover placeholder" />
                )}
                <StageBand game={game} />
              </td>
              <td className="name">{game.name}</td>
              {show.has("price") && (
                <td className="nowrap">
                  <Price final={game.price} initial={game.price_initial} currency={game.currency} />
                </td>
              )}
              {show.has("release") && <td className="nowrap">{formatRelease(game.release_date) || "—"}</td>}
              {show.has("status") && (
                <td>
                  <StatusSelect game={game} run={run} />
                </td>
              )}
              {show.has("rating") && (
                <td>
                  <RatingSelect game={game} run={run} />
                </td>
              )}
              {show.has("lists") && (
                <td>
                  <ListChips game={game} lists={lists} inList={inList} run={run} max={2} />
                </td>
              )}
              {show.has("remove") && (
                <td>
                  <button className="danger" onClick={() => onDelete(game)} aria-label={`Remover ${game.name}`}>
                    Remover
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {more}
    </>
  );
}

// Botão com ícone que abre a lista de colunas da tabela para marcar quais aparecem.
export function ColumnsMenu({ columns, setColumns }: { columns: Column[]; setColumns: (c: Column[]) => void }) {
  const menu = useRef<HTMLDetailsElement>(null);

  // Fecha ao clicar fora dele.
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (menu.current && !menu.current.contains(e.target as Node)) menu.current.open = false;
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  // Mantém a ordem da tabela, qualquer que seja a ordem dos cliques.
  const toggle = (c: Column, on: boolean) =>
    setColumns((Object.keys(COLUMNS) as Column[]).filter((k) => (k === c ? on : columns.includes(k))));

  return (
    <details className="menu columns-menu" ref={menu}>
      <summary aria-label="Colunas" title="Colunas da tabela">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M9 4v16M15 4v16" />
        </svg>
      </summary>
      <div className="menu-items">
        {(Object.entries(COLUMNS) as [Column, string][]).map(([c, label]) => (
          <label key={c} className="check">
            <input type="checkbox" checked={columns.includes(c)} onChange={(e) => toggle(c, e.currentTarget.checked)} />
            {label}
          </label>
        ))}
      </div>
    </details>
  );
}
