import type { Game, List } from "../db";
import { ListChips, Price, RatingSelect, StatusSelect, dragGame, type Run } from "./common";

type Props = {
  games: Game[];
  lists: List[];
  inList: (gameId: number, listId: number) => boolean;
  run: Run;
  onDelete: (game: Game) => void;
};

export function GameTable({ games, lists, inList, run, onDelete }: Props) {
  return (
    <table className="games">
      <thead>
        <tr>
          <th />
          <th>Jogo</th>
          <th>Preço</th>
          <th>Status</th>
          <th>Nota</th>
          <th>Listas</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {games.map((game) => (
          <tr key={game.id} {...dragGame(game.id)}>
            <td>
              {game.image_url ? (
                <img className="cover" src={game.image_url} alt="" />
              ) : (
                <div className="cover placeholder" />
              )}
            </td>
            <td className="name">{game.name}</td>
            <td className="nowrap">
              <Price final={game.price} initial={game.price_initial} currency={game.currency} />
            </td>
            <td>
              <StatusSelect game={game} run={run} />
            </td>
            <td>
              <RatingSelect game={game} run={run} />
            </td>
            <td>
              <ListChips game={game} lists={lists} inList={inList} run={run} />
            </td>
            <td>
              <button className="danger" onClick={() => onDelete(game)} aria-label={`Remover ${game.name}`}>
                Remover
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
