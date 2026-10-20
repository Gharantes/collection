import type { Game, List } from "../db";
import { formatRelease } from "../games";
import { ListChips, Medal, Price, RatingSelect, StageBand, StatusSelect, dragGame, useBatches, type Run } from "./common";

type Props = {
  games: Game[];
  // Páginas Early Access e Pre-release: só imagem, nome, preço e release date.
  compact?: boolean;
  lists: List[];
  inList: (gameId: number, listId: number) => boolean;
  run: Run;
  onDelete: (game: Game) => void;
  onOpen: (id: number) => void;
};

export function GameTable({ games, compact = false, lists, inList, run, onDelete, onOpen }: Props) {
  const { visible, more } = useBatches(games);
  return (
    <>
      <table className="games">
        <thead>
          <tr>
            <th />
            <th>Jogo</th>
            <th>Preço</th>
            {compact ? (
              <th>Release Date</th>
            ) : (
              <>
                <th>Status</th>
                <th>Nota</th>
                <th>Listas</th>
                <th />
              </>
            )}
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
              <td className="nowrap">
                <Price final={game.price} initial={game.price_initial} currency={game.currency} />
              </td>
              {compact ? (
                <td className="nowrap">{formatRelease(game.release_date) || "—"}</td>
              ) : (
                <>
                  <td>
                    <StatusSelect game={game} run={run} />
                  </td>
                  <td>
                    <RatingSelect game={game} run={run} />
                  </td>
                  <td>
                    <ListChips game={game} lists={lists} inList={inList} run={run} max={2} />
                  </td>
                  <td>
                    <button className="danger" onClick={() => onDelete(game)} aria-label={`Remover ${game.name}`}>
                      Remover
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {more}
    </>
  );
}
