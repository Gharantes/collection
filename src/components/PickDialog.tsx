import { useEffect, useRef } from "react";
import type { Game, List } from "../db";
import { Cover } from "./common";

type Props = {
  game: Game;
  lists: List[];
  inList: (gameId: number, listId: number) => boolean;
  onOpen: () => void;
  onReroll: () => void;
  onClose: () => void;
};

// Jogo sorteado pelo "O que jogar?": capa, nome e listas, com "Ir à página" e "Reroll".
export function PickDialog({ game, lists, inList, onOpen, onReroll, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const gameLists = lists.filter((list) => inList(game.id, list.id));

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="pick-dialog"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
    >
      <div className="pick-dialog-body">
        <Cover key={game.id} game={game} />
        <h2>{game.name}</h2>
        {gameLists.length > 0 && (
          <div className="chips">
            {gameLists.map((list) => (
              <span key={list.id} className="chip readonly">
                {list.name}
              </span>
            ))}
          </div>
        )}
        <div className="pick-dialog-actions">
          <button className="ghost" onClick={onReroll}>
            Reroll
          </button>
          <button className="play" onClick={onOpen}>
            Ir à página
          </button>
        </div>
      </div>
    </dialog>
  );
}
