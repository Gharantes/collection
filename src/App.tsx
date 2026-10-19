import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ask } from "@tauri-apps/plugin-dialog";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { listen } from "@tauri-apps/api/event";
import {
  addPlaySession,
  deleteGame,
  deleteSavedFilter,
  listGames,
  listLists,
  listMemberships,
  listPlaySessions,
  listSavedFilters,
  listStatusEvents,
  listStatuses,
  refreshPrices,
  refreshReleases,
  saveFilter,
  type Game,
  type List,
  type PlaySession,
  type SavedFilter,
  type StatusDef,
  type StatusEvent,
} from "./db";
import { SORTS, discount, hitsTarget, matchModes, money, priceChanges, releaseChanges, sortGames, type Sort } from "./games";
import { readJson, readPref, readTime, savePref } from "./prefs";
import { AddGame } from "./components/AddGame";
import { ErrorBanner, StatusesContext } from "./components/common";
import { GameDetail } from "./components/GameDetail";
import { GameGrid } from "./components/GameGrid";
import { GameTable } from "./components/GameTable";
import { MoreFilters } from "./components/MoreFilters";
import { NO_EXTRA, extraCount, fromSaved, inRating, stageOf, toSaved, type Extra } from "./filters";
import { PickDialog } from "./components/PickDialog";
import { Sidebar, type Filter } from "./components/Sidebar";
import { StatsPage } from "./components/StatsPage";
import { UpdatesPage, type UpdateRun } from "./components/UpdatesPage";
import "./App.css";

type View = "cards" | "table";

const PRICES_AT = "collection.pricesAt";
const UPDATES = "collection.updates";
const MAX_UPDATES = 30;
const DAY = 24 * 60 * 60 * 1000;
const key = (gameId: number, listId: number) => `${gameId}:${listId}`;

// Rota do jogo aberto: #/jogo/<id>. Sem id, mostra a coleção.
const routeId = () => {
  const m = location.hash.match(/^#\/jogo\/(\d+)$/);
  return m ? Number(m[1]) : null;
};

// Notificação do sistema; pede permissão na primeira vez.
const notify = async (title: string, body: string) => {
  if ((await isPermissionGranted()) || (await requestPermission()) === "granted") sendNotification({ title, body });
};

function App() {
  const [games, setGames] = useState<Game[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [members, setMembers] = useState<Set<string>>(new Set());
  const [events, setEvents] = useState<StatusEvent[]>([]);
  const [statuses, setStatuses] = useState<StatusDef[]>([]);
  const [sessions, setSessions] = useState<PlaySession[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [filter, setFilter] = useState<Filter>(null);
  const [extra, setExtra] = useState<Extra>(NO_EXTRA);
  const [moreOpen, setMoreOpen] = useState(false);
  const [nameFilter, setNameFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>(() => readPref("collection.view", ["cards", "table"], "cards"));
  const [sort, setSort] = useState<Sort>(() => readPref("collection.sort", Object.keys(SORTS) as Sort[], "name"));
  const [openId, setOpenId] = useState<number | null>(routeId);
  const listScroll = useRef(0);
  const [refreshing, setRefreshing] = useState(false);
  const [updates, setUpdates] = useState<UpdateRun[]>(() => readJson(UPDATES, []));
  const [pricesAt, setPricesAt] = useState(() => readTime(PRICES_AT));
  const [pickedId, setPickedId] = useState<number | null>(null);

  const load = async () => {
    const [st, g, l, m, e, s, f] = await Promise.all([
      listStatuses(),
      listGames(),
      listLists(),
      listMemberships(),
      listStatusEvents(),
      listPlaySessions(),
      listSavedFilters(),
    ]);
    setStatuses(st);
    setGames(g);
    setLists(l);
    setMembers(new Set(m.map((x) => key(x.game_id, x.list_id))));
    setEvents(e);
    setSessions(s);
    setSavedFilters(f);
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

  useEffect(() => {
    const onHash = () => setOpenId(routeId());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // A página do jogo abre no topo; ao voltar, a coleção volta para onde estava.
  useLayoutEffect(() => {
    window.scrollTo(0, openId == null ? listScroll.current : 0);
  }, [openId]);

  const openGame = (id: number) => {
    if (openId == null) listScroll.current = window.scrollY;
    location.hash = `#/jogo/${id}`;
  };

  // Volta pelo histórico; se a página do jogo foi a primeira (recarregou nela), vai para a coleção.
  const closeGame = () => {
    if (routeId() == null) return;
    if (history.length > 1) history.back();
    else location.hash = "";
  };

  const selectFilter = (f: Filter) => {
    setFilter(f);
    if (openId != null) {
      listScroll.current = 0;
      location.hash = "";
    }
  };

  // Tira dos filtros os status que foram apagados.
  useEffect(() => {
    const keys = new Set(statuses.map((s) => s.key));
    if ([...extra.statuses.keys()].some((k) => !keys.has(k)))
      setExtra({ ...extra, statuses: new Map([...extra.statuses].filter(([k]) => keys.has(k))) });
  }, [statuses]);

  // Carrega um filtro salvo, sem as listas que foram apagadas.
  const loadFilter = (f: SavedFilter) => {
    const { extra, text } = fromSaved(f.filter);
    const ids = new Set(lists.map((l) => l.id));
    setExtra({ ...extra, lists: new Map([...extra.lists].filter(([id]) => ids.has(id))) });
    setNameFilter(text);
  };

  const onDeleteFilter = (f: SavedFilter) =>
    run(async () => {
      if (await ask(`Apagar o filtro salvo "${f.name}"?`, { title: "Filtros salvos", kind: "warning" }))
        await deleteSavedFilter(f.id);
    })();

  // O filtro salvo igual ao atual, para o chip dele aparecer marcado.
  const current = toSaved(extra, nameFilter);
  const currentSaved = savedFilters.find((f) => {
    const saved = fromSaved(f.filter);
    return toSaved(saved.extra, saved.text) === current;
  });

  useEffect(() => savePref("collection.view", view), [view]);
  useEffect(() => savePref("collection.sort", sort), [sort]);

  // Atualiza preços e Early Access/Pre-release, guarda as mudanças encontradas e avisa dos jogos que entraram no preço-alvo agora.
  const onRefresh = async () => {
    setRefreshing(true);
    await run(async () => {
      const before = await listGames();
      await refreshPrices();
      await refreshReleases();
      const after = await listGames();
      const now = Date.now();
      savePref(PRICES_AT, String(now));
      setPricesAt(now);
      const changes = [...priceChanges(before, after), ...releaseChanges(before, after)];
      if (changes.length > 0)
        setUpdates((u) => {
          const next = [{ at: now, changes }, ...u].slice(0, MAX_UPDATES);
          savePref(UPDATES, JSON.stringify(next));
          return next;
        });
      const hitIds = new Set(changes.filter((c) => c.kind === "target").map((c) => c.gameId));
      const hits = after.filter((g) => hitIds.has(g.id));
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
    if (openId === game.id) closeGame();
    run(() => deleteGame(game.id))();
  };

  const inList = (gameId: number, listId: number) => members.has(key(gameId, listId));
  const listCount = (listId: number) => games.filter((g) => inList(g.id, listId)).length;

  const isLinked = (g: Game) => g.launch != null;
  const inFilter = (g: Game) =>
    filter == null || filter === "stats" || filter === "updates"
      ? true
      : filter === "target"
        ? hitsTarget(g)
        : inList(g.id, filter);

  const name = nameFilter.trim().toLowerCase();
  const shown = sortGames(
    games.filter(
      (g) =>
        inFilter(g) &&
        matchModes((s) => g.status === s, extra.statuses) &&
        matchModes((id) => inList(g.id, id), extra.lists) &&
        matchModes((s) => stageOf(g) === s, extra.stages) &&
        (!extra.onlyLinked || isLinked(g)) &&
        inRating(g.rating, extra) &&
        g.name.toLowerCase().includes(name),
    ),
    sort,
  );
  const linked = shown.filter(isLinked);
  const picked = games.find((g) => g.id === pickedId);

  // Sorteia um vinculado entre os mostrados; no reroll, evita repetir o atual se houver outro.
  const pick = () => {
    const pool = linked.length > 1 ? linked.filter((g) => g.id !== pickedId) : linked;
    if (pool.length > 0) setPickedId(pool[Math.floor(Math.random() * pool.length)].id);
  };

  const title =
    filter == null
      ? "Todos os jogos"
      : filter === "target"
        ? "No preço-alvo"
        : filter === "stats"
          ? "Estatísticas"
          : filter === "updates"
            ? "Atualizações"
            : (lists.find((l) => l.id === filter)?.name ?? "");

  return (
    <StatusesContext.Provider value={statuses}>
    <div className="layout">
      <Sidebar
        lists={lists}
        filter={filter}
        setFilter={selectFilter}
        total={games.length}
        targetCount={games.filter(hitsTarget).length}
        listCount={listCount}
        run={run}
      />

      <main className="main">
        {openId == null && <AddGame run={run} onError={setError} />}

        {openId != null ? (
          games.length === 0 ? null : (
            <GameDetail
              game={games.find((g) => g.id === openId)}
              events={events}
              sessions={sessions}
              lists={lists}
              inList={inList}
              run={run}
              error={error}
              onCloseError={() => setError(null)}
              onBack={closeGame}
              onDelete={onDeleteGame}
            />
          )
        ) : filter === "stats" ? (
          <>
            <div className="page-head">
              <h1>{title}</h1>
            </div>
            <StatsPage games={games} events={events} sessions={sessions} />
          </>
        ) : filter === "updates" ? (
          <>
            <div className="page-head">
              <h1>{title}</h1>
            </div>
            <ErrorBanner error={error} onClose={() => setError(null)} />
            <UpdatesPage
              runs={updates}
              lastAt={pricesAt}
              refreshing={refreshing}
              exists={(id) => games.some((g) => g.id === id)}
              onRefresh={onRefresh}
              onOpen={openGame}
            />
          </>
        ) : (
          <>
          <div className="page-head">
            <h1>{title}</h1>
            <span className="muted">
              {shown.length} {shown.length === 1 ? "jogo" : "jogos"}
            </span>
            <button
              className="ghost pick"
              onClick={pick}
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
            <button className={`ghost more-toggle ${moreOpen ? "on" : ""}`} onClick={() => setMoreOpen(!moreOpen)} aria-expanded={moreOpen}>
              Mais filtros{extraCount(extra) > 0 && ` (${extraCount(extra)})`} {moreOpen ? "▴" : "▾"}
            </button>
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

          {moreOpen && (
            <MoreFilters
              lists={lists}
              extra={extra}
              setExtra={setExtra}
              onSave={(name) => run(() => saveFilter(name, current))()}
            />
          )}

          {savedFilters.length > 0 && (
            <div className="chips saved-filters">
              {savedFilters.map((f) => {
                const on = f.id === currentSaved?.id;
                return (
                  <span key={f.id} className={`chip saved-filter ${on ? "on" : ""}`}>
                    <button
                      className="chip-load"
                      onClick={() => (on ? (setExtra(NO_EXTRA), setNameFilter("")) : loadFilter(f))}
                      title={on ? "Limpar o filtro" : "Carregar este filtro"}
                    >
                      {f.name}
                    </button>
                    <button className="chip-remove" onClick={() => onDeleteFilter(f)} aria-label={`Apagar filtro ${f.name}`}>
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <ErrorBanner error={error} onClose={() => setError(null)} />

          {shown.length === 0 ? (
            <p className="empty">{games.length === 0 ? "Nenhum jogo ainda. Busque um acima." : "Nenhum jogo aqui."}</p>
          ) : view === "cards" ? (
            <GameGrid games={shown} onOpen={openGame} />
          ) : (
            <GameTable
              games={shown}
              compact={shown.every((g) => g.release_stage != null)}
              lists={lists}
              inList={inList}
              run={run}
              onDelete={onDeleteGame}
              onOpen={openGame}
            />
          )}
          </>
        )}

        {picked && (
          <PickDialog
            game={picked}
            lists={lists}
            inList={inList}
            onOpen={() => {
              setPickedId(null);
              openGame(picked.id);
            }}
            onReroll={pick}
            onClose={() => setPickedId(null)}
          />
        )}
      </main>
    </div>
    </StatusesContext.Provider>
  );
}

export default App;
