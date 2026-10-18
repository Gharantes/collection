import type { Game } from "../db";
import { discount, hitsTarget, ratingTier } from "../games";
import { Cover, Medal, dragGame, useStatusLabels } from "./common";

export function GameGrid({ games, onOpen }: { games: Game[]; onOpen: (id: number) => void }) {
  const statusLabels = useStatusLabels();
  return (
    <div className="grid">
      {games.map((game) => {
        const off = discount(game.price_initial, game.price);
        return (
          <button
            key={game.id}
            className={hitsTarget(game) ? "game-card on-target" : "game-card"}
            onClick={() => onOpen(game.id)}
            {...dragGame(game.id)}
          >
            <span className="poster-wrap">
              <Cover game={game} />
              <Medal game={game} />
              {off > 0 && <span className="sale sale-badge">-{off}%</span>}
              {game.rating != null && (
                <span className="badge" data-tier={ratingTier(game.rating)}>
                  {game.rating}
                </span>
              )}
            </span>
            <span className="game-card-name">{game.name}</span>
            {game.status && (
              <span className="status-text" data-status={game.status}>
                {statusLabels[game.status]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
