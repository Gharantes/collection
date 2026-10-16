import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import {
  deleteEvent,
  setEventDate,
  setLaunch,
  setNotes,
  setTarget,
  type Game,
  type List,
  type StatusEvent,
} from "../db";
import { eventLabels, formatDate, hitsTarget, toCents } from "../games";
import { Cover, ListChips, Price, RatingSelect, StatusSelect, type Run } from "./common";
import { NotesEditor } from "./NotesEditor";
import { SavesPanel } from "./SavesPanel";

type Props = {
  game: Game | undefined;
  events: StatusEvent[];
  lists: List[];
  inList: (gameId: number, listId: number) => boolean;
  run: Run;
  error: string | null;
  onClose: () => void;
  onDelete: (game: Game) => void;
};

// Modal de detalhes; abre quando recebe um jogo e fecha quando recebe undefined.
export function GameDetail({ game, events, lists, inList, run, error, onClose, onDelete }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!game) dialog.current?.close();
    else if (!dialog.current?.open) dialog.current?.showModal();
  }, [game?.id]);

  return (
    <dialog
      ref={dialog}
      className="detail"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {game && (
        <Body
          game={game}
          events={events.filter((e) => e.game_id === game.id)}
          lists={lists}
          inList={inList}
          run={run}
          error={error}
          onClose={onClose}
          onDelete={onDelete}
        />
      )}
    </dialog>
  );
}

function Body({ game, events, lists, inList, run, error, onClose, onDelete }: Props & { game: Game }) {
  const labels = eventLabels(events);
  const startedAt = events.find((_, i) => labels[i] === "Começou")?.at;
  const finishedAt = events.filter((e) => e.status === "finished").pop()?.at;

  const linkSteam = () =>
    run(async () => {
      if (!(await invoke<boolean>("steam_installed", { appId: game.steam_id })))
        throw new Error("O jogo não está instalado na Steam.");
      await setLaunch(game.id, "steam");
    })();

  const linkExe = () =>
    run(async () => {
      const path = await open({ multiple: false, directory: false, title: "Escolha o executável do jogo" });
      if (path) await setLaunch(game.id, "exe", path);
    })();

  // Se o jogo sumiu, desvincula para o botão voltar a ser "Vincular".
  const launch = () =>
    run(async () => {
      try {
        if (game.launch === "steam") await invoke("launch_steam", { appId: game.steam_id });
        else await invoke("launch_exe", { path: game.exe_path });
      } catch (e) {
        if (e !== "not_found") throw e;
        await setLaunch(game.id, null);
        throw new Error("Não encontrei o jogo. Vincule de novo.");
      }
    })();

  return (
    <>
      <div className="detail-body">
        <Cover key={game.id} game={game} />
        <div className="detail-info">
          <h2>{game.name}</h2>
          <p>
            <Price final={game.price} initial={game.price_initial} currency={game.currency} />
          </p>

          <div className="launch">
            {game.launch ? (
              <>
                <button className="play" onClick={launch}>
                  ▶ Abrir
                </button>
                <span className="muted">
                  {game.launch === "steam" ? "pela Steam" : game.exe_path?.split(/[\\/]/).pop()}
                </span>
              </>
            ) : (
              <details className="menu">
                <summary>Vincular ▾</summary>
                <div className="menu-items">
                  <button
                    onClick={linkSteam}
                    disabled={game.steam_id == null}
                    title={game.steam_id == null ? "Este jogo não veio da Steam" : undefined}
                  >
                    Vincular com Steam
                  </button>
                  <button onClick={linkExe}>Vincular com executável</button>
                </div>
              </details>
            )}
          </div>
          {error && <p className="error">{error}</p>}

          <label className="field">
            <span>Status</span>
            <StatusSelect game={game} run={run} />
          </label>
          <label className="field">
            <span>Nota</span>
            <RatingSelect game={game} run={run} />
          </label>
          <div className="field">
            <span>Listas</span>
            <ListChips game={game} lists={lists} inList={inList} run={run} />
          </div>
          <div className="field">
            <span>Alerta</span>
            <div className="target" key={game.id}>
              <input
                inputMode="decimal"
                placeholder="Preço-alvo"
                defaultValue={game.target_price == null ? "" : (game.target_price / 100).toFixed(2).replace(".", ",")}
                onBlur={(e) => run(() => setTarget(game.id, toCents(e.currentTarget.value), game.target_discount))()}
                aria-label="Preço-alvo"
              />
              <span className="muted">ou</span>
              <input
                type="number"
                min={1}
                max={100}
                placeholder="% off"
                defaultValue={game.target_discount ?? ""}
                onBlur={(e) => {
                  const v = e.currentTarget.valueAsNumber;
                  const pct = Number.isInteger(v) && v >= 1 && v <= 100 ? v : null;
                  run(() => setTarget(game.id, game.target_price, pct))();
                }}
                aria-label="Desconto mínimo em %"
              />
              {hitsTarget(game) && <span className="sale">No alvo</span>}
            </div>
          </div>
          {(startedAt || finishedAt) && (
            <p className="dates muted">
              {startedAt && <>Começou em {formatDate(startedAt)}</>}
              {startedAt && finishedAt && " · "}
              {finishedAt && <>Terminou em {formatDate(finishedAt)}</>}
            </p>
          )}
        </div>
      </div>

      <div className="detail-history">
        <h3>Histórico</h3>
        {events.length === 0 ? (
          <p className="muted">Mudar o status registra a data aqui.</p>
        ) : (
          <ol className="timeline">
            {events.map((e, i) => (
              <li key={e.id} data-status={e.status}>
                <span className="timeline-label">{labels[i]}</span>
                <input
                  type="date"
                  value={e.at}
                  required
                  onChange={(ev) => {
                    const at = ev.currentTarget.value;
                    if (at) run(() => setEventDate(e.id, at))();
                  }}
                  aria-label={`Data de ${labels[i]}`}
                />
                <button
                  className="chip-remove"
                  onClick={run(() => deleteEvent(e.id))}
                  aria-label={`Apagar registro ${labels[i]}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      <SavesPanel game={game} run={run} />

      <div className="detail-notes">
        <h3>Anotações</h3>
        <NotesEditor
          gameId={game.id}
          initial={game.notes ?? ""}
          onSave={(text) => run(() => setNotes(game.id, text))()}
        />
      </div>

      <div className="detail-actions">
        <button className="danger" onClick={() => onDelete(game)}>
          Remover jogo
        </button>
        <button className="ghost" onClick={onClose}>
          Fechar
        </button>
      </div>
    </>
  );
}
