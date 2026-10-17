import { useEffect, useState } from "react";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { listen } from "@tauri-apps/api/event";
import {
  addPlaySession,
  deleteGame,
  listGames,
  listLists,
  listMemberships,
  listPlaySessions,
  listStatusEvents,
  refreshPrices,
  type Game,
  type List,
  type PlaySession,
  type Status,
  type StatusEvent,
} from "./db";
import { SORTS, discount, hitsTarget, money, sortGames, type Sort } from "./games";
import { readPref, readTime, savePref } from "./prefs";
import { AddGame } from "./components/AddGame";
import { STATUSES } from "./components/common";
import { GameDetail } from "./components/GameDetail";
import { GameGrid } from "./components/GameGrid";
import { GameTable } from "./components/GameTable";
import { Sidebar, type Filter } from "./components/Sidebar";
import { StatsPage } from "./components/StatsPage";
import { UpdateBanner } from "./components/UpdateBanner";
import "./App.css";

type View = "cards" | "table";

const PRICES_AT = "collection.pricesAt";
const DAY = 24 * 60 * 60 * 1000;
const key = (gameId: number, listId: number) => `${gameId}:${listId}`;

// Notificação do sistema; pede permissão na primeira vez.
const notify = async (title: string, body: string) => {
  if ((await isPermissionGranted()) || (await requestPermission()) === "granted") sendNotification({ title, body });
};

function App() {
  const [games, setGames] = useState<Game[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [members, setMembers] = useState<Set<string>>(new Set());
  const [events, setEvents] = useState<StatusEvent[]>([]);
  const [sessions, setSessions] = useState<PlaySession[]>([]);
  const [filter, setFilter] = useState<Filter>(null);
  const [statusFilter, setStatusFilter] = useState<Status | "">("");
  const [nameFilter, setNameFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>(() => readPref("collection.view", ["cards", "table"], "cards"));
  const [sort, setSort] = useState<Sort>(() => readPref("collection.sort", Object.keys(SORTS) as Sort[], "name"));
  const [openId, setOpenId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const [g, l, m, e, s] = await Promise.all([
      listGames(),
      listLists(),
      listMemberships(),
      listStatusEvents(),
      listPlaySessions(),
    ]);
    setGames(g);
    setLists(l);
    setMembers(new Set(m.map((x) => key(x.game_id, x.list_id))));
    setEvents(e);
    setSessions(s);
  };

  // Roda a ação, recarrega tudo (mesmo se falhar) e mostra erro na tela.
  const run = (action: () => Promise<unknown>) => async () => {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    try {
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  useEffect(() => {
    run(async () => {})();
  }, []);

  // Registra a sessão quando um jogo aberto pelo app fecha, se durou pelo menos 1 minuto.
  useEffect(() => {
    const unlisten = listen<{ gameId: number; startedAt: number; seconds: number }>("game-exited", ({ payload }) => {
      if (payload.seconds >= 60) run(() => addPlaySession(payload.gameId, payload.startedAt, payload.seconds))();
    });
    return () => {
      unlisten.then((stop) => stop());
    };
  }, []);

  useEffect(() => savePref("collection.view", view), [view]);
  useEffect(() => savePref("collection.sort", sort), [sort]);

  // Atualiza preços e avisa dos jogos que entraram no preço-alvo agora.
  const onRefresh = async () => {
    setRefreshing(true);
    await run(async () => {
      const before = new Set((await listGames()).filter(hitsTarget).map((g) => g.id));
      await refreshPrices();
      savePref(PRICES_AT, String(Date.now()));
      const hits = (await listGames()).filter((g) => hitsTarget(g) && !before.has(g.id));
      if (hits.length === 1) {
        const g = hits[0];
        await notify(`${g.name} no preço-alvo`, `${money(g.price, g.currency)} (-${discount(g.price_initial, g.price)}%)`);
      } else if (hits.length > 1) {
        await notify(`${hits.length} jogos no preço-alvo`, hits.map((g) => g.name).join(", "));
      }
    })();
    setRefreshing(false);
  };

  // Atualiza os preços sozinho uma vez por dia, ao abrir o app.
  useEffect(() => {
    if (Date.now() - readTime(PRICES_AT) > DAY) onRefresh();
  }, []);

  const onDeleteGame = (game: Game) => {
    setOpenId(null);
    run(() => deleteGame(game.id))();
  };

  const inList = (gameId: number, listId: number) => members.has(key(gameId, listId));
  const listCount = (listId: number) => games.filter((g) => inList(g.id, listId)).length;

  const name = nameFilter.trim().toLowerCase();
  const shown = sortGames(
    games.filter(
      (g) =>
        (filter == null || filter === "stats" || (filter === "target" ? hitsTarget(g) : inList(g.id, filter))) &&
        (!statusFilter || g.status === statusFilter) &&
        g.name.toLowerCase().includes(name),
    ),
    sort,
  );
  const linked = shown.filter((g) => g.launch != null);

  const title =
    filter == null
      ? "Todos os jogos"
      : filter === "target"
        ? "No preço-alvo"
        : filter === "stats"
          ? "Estatísticas"
          : (lists.find((l) => l.id === filter)?.name ?? "");

  return (
    <div className="layout">
      <Sidebar
        lists={lists}
        filter={filter}
        setFilter={setFilter}
        total={games.length}
        targetCount={games.filter(hitsTarget).length}
        listCount={listCount}
        run={run}
      />

      <main className="main">
        <UpdateBanner run={run} />
        <AddGame run={run} onError={setError} />

        {filter === "stats" ? (
          <>
            <div className="page-head">
              <h1>{title}</h1>
            </div>
            <StatsPage games={games} events={events} sessions={sessions} />
          </>
        ) : (
          <>
          <div className="page-head">
            <h1>{title}</h1>
            <span className="muted">
              {shown.length} {shown.length === 1 ? "jogo" : "jogos"}
            </span>
            <button className="ghost refresh" onClick={onRefresh} disabled={refreshing}>
              {refreshing ? "Atualizando…" : "Atualizar preços"}
            </button>
            <button
              className="ghost pick"
              onClick={() => setOpenId(linked[Math.floor(Math.random() * linked.length)].id)}
              disabled={linked.length === 0}
              title="Sorteia um jogo vinculado (Steam ou executável) entre os mostrados"
            >
              O que jogar?
            </button>
          </div>

          <div className="toolbar">
            <input
              className="grow"
              type="search"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.currentTarget.value)}
              placeholder="Filtrar por nome"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.currentTarget.value as Status | "")}
              aria-label="Filtrar por status"
            >
              <option value="">Todos os status</option>
              {Object.entries(STATUSES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select value={sort} onChange={(e) => setSort(e.currentTarget.value as Sort)} aria-label="Ordenar por">
              {Object.entries(SORTS).map(([value, label]) => (
                <option key={value} value={value}>
                  Ordenar: {label}
                </option>
              ))}
            </select>
            <div className="segmented" role="group" aria-label="Visualização">
              <button className={view === "cards" ? "on" : ""} onClick={() => setView("cards")}>
                Cards
              </button>
              <button className={view === "table" ? "on" : ""} onClick={() => setView("table")}>
                Tabela
              </button>
            </div>
          </div>

          {error && <p className="error">{error}</p>}

          {shown.length === 0 ? (
            <p className="empty">{games.length === 0 ? "Nenhum jogo ainda. Busque um acima." : "Nenhum jogo aqui."}</p>
          ) : view === "cards" ? (
            <GameGrid games={shown} onOpen={setOpenId} />
          ) : (
            <GameTable games={shown} lists={lists} inList={inList} run={run} onDelete={onDeleteGame} />
          )}
          </>
        )}
      </main>

      <GameDetail
        game={games.find((g) => g.id === openId)}
        events={events}
        sessions={sessions}
        lists={lists}
        inList={inList}
        run={run}
        error={error}
        onClose={() => setOpenId(null)}
        onDelete={onDeleteGame}
      />
    </div>
  );
}

export default App;
