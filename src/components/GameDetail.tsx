import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import {
  deleteEvent,
  setAchievements,
  setEventDate,
  setLaunch,
  setReleaseDate,
  setReleaseStage,
  setTarget,
  type Achievements,
  type Game,
  type List,
  type PlaySession,
  type ReleaseStage,
  type StatusEvent,
} from "../db";
import { eventLabels, formatDate, formatDuration, formatRelease, hitsTarget, toCents } from "../games";
import { Cover, ErrorBanner, ListChips, Price, RatingSelect, StatusSelect, type Run } from "./common";
import { NotesPanel } from "./NotesPanel";
import { SavesPanel } from "./SavesPanel";

type Props = {
  game: Game | undefined;
  events: StatusEvent[];
  sessions: PlaySession[];
  lists: List[];
  inList: (gameId: number, listId: number) => boolean;
  run: Run;
  error: string | null;
  onCloseError: () => void;
  onBack: () => void;
  onDelete: (game: Game) => void;
};

// Etapas do slider de conquistas: não importam, platinar depois de terminar, caçando a platina.
const ACHIEVEMENT_STEPS: { goal: Achievements | null; label: string }[] = [
  { goal: null, label: "Não importam" },
  { goal: "later", label: "Platinar depois" },
  { goal: "hunting", label: "Caçando platina" },
];

// Página de detalhes do jogo (rota #/jogo/<id>).
export function GameDetail({ game, events, ...props }: Props) {
  if (!game)
    return (
      <div className="detail">
        <button className="ghost back" onClick={props.onBack}>
          ← Voltar
        </button>
        <p className="empty">Jogo não encontrado.</p>
      </div>
    );
  return (
    <div className="detail">
      <Body
        game={game}
        events={events.filter((e) => e.game_id === game.id)}
        {...props}
        sessions={props.sessions.filter((s) => s.game_id === game.id)}
      />
    </div>
  );
}

function Body({ game, events, sessions, lists, inList, run, error, onCloseError, onBack, onDelete }: Props & { game: Game }) {
  const labels = eventLabels(events);
  const startedAt = events.find((_, i) => labels[i] === "Começou")?.at;
  const finishedAt = events.filter((e) => e.status === "finished").pop()?.at;
  const played = sessions.reduce((sum, s) => sum + s.seconds, 0);

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
        else await invoke("launch_exe", { gameId: game.id, path: game.exe_path });
      } catch (e) {
        if (e !== "not_found") throw e;
        await setLaunch(game.id, null);
        throw new Error("Não encontrei o jogo. Vincule de novo.");
      }
    })();

  return (
    <>
      <button className="ghost back" onClick={onBack}>
        ← Voltar
      </button>
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
          <ErrorBanner error={error} onClose={onCloseError} />

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
            <span>Release</span>
            <div className="release">
              {(["early_access", "pre_release"] as ReleaseStage[]).map((stage) => (
                <label key={stage} className="check">
                  <input
                    type="checkbox"
                    checked={game.release_stage === stage}
                    onChange={(e) => {
                      const on = e.currentTarget.checked;
                      run(() => setReleaseStage(game.id, on ? stage : null))();
                    }}
                  />
                  {stage === "early_access" ? "Early Access" : "Pre-release"}
                </label>
              ))}
              <input
                key={game.id}
                placeholder="Release Date"
                defaultValue={formatRelease(game.release_date)}
                disabled={game.release_stage == null}
                onBlur={(e) => run(() => setReleaseDate(game.id, e.currentTarget.value.trim() || null))()}
                aria-label="Release Date"
                title="Release Date"
              />
            </div>
          </div>
          <div className="field">
            <span>Conquistas</span>
            <div className="achievements">
              <input
                type="range"
                min={0}
                max={2}
                step={1}
                value={ACHIEVEMENT_STEPS.findIndex((s) => s.goal === game.achievements)}
                onChange={(e) =>
                  run(() => setAchievements(game.id, ACHIEVEMENT_STEPS[Number(e.currentTarget.value)].goal))()
                }
                aria-label="Conquistas"
              />
              <div className="steps">
                {ACHIEVEMENT_STEPS.map((s) => (
                  <button
                    key={s.label}
                    className={s.goal === game.achievements ? "active" : ""}
                    onClick={run(() => setAchievements(game.id, s.goal))}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
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
          {sessions.length > 0 && (
            <p className="dates muted">
              Tempo de jogo: {formatDuration(played)} em {sessions.length}{" "}
              {sessions.length === 1 ? "sessão" : "sessões"}
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

      <NotesPanel gameId={game.id} run={run} />

      <div className="detail-actions">
        <button className="danger" onClick={() => onDelete(game)}>
          Remover jogo
        </button>
      </div>
    </>
  );
}
