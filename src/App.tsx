import { useEffect, useRef, useState } from "react";
import {
  addGame,
  addList,
  deleteGame,
  deleteList,
  exportBackup,
  listGames,
  listLists,
  listMemberships,
  refreshPrices,
  restoreBackup,
  setMembership,
  setNotes,
  setRating,
  setStatus,
  type Game,
  type List,
  type Status,
} from "./db";
import { searchSteam, type SteamApp } from "./steam";
import { NotesEditor } from "./NotesEditor";
import { parseBackup } from "./backup";
import { ask, open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { SORTS, discount, money, ratingTier, sortGames, type Sort } from "./games";
import "./App.css";

type View = "cards" | "table";

const RATINGS = Array.from({ length: 11 }, (_, i) => i);
const STATUSES: Record<Status, string> = {
  backlog: "Backlog",
  playing: "Jogando",
  finished: "Terminado",
};
const key = (gameId: number, listId: number) => `${gameId}:${listId}`;

// Capa vertical da biblioteca da Steam.
const portrait = (steamId: number) =>
  `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${steamId}/library_600x900.jpg`;

// Preferência salva no localStorage; volta ao padrão se não houver ou for inválida.
const readPref = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
  try {
    const v = localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
};

const savePref = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Sem storage, a preferência só não fica salva.
  }
};

// Capa vertical; sem capa, mostra a imagem pequena e o nome.
function Cover({ game }: { game: Game }) {
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
function Price(p: { final: number | null; initial: number | null; currency: string | null }) {
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

function App() {
  const [games, setGames] = useState<Game[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [members, setMembers] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<Status | "">("");
  const [nameFilter, setNameFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<SteamApp[]>([]);
  const [view, setView] = useState<View>(() => readPref("collection.view", ["cards", "table"], "cards"));
  const [sort, setSort] = useState<Sort>(() =>
    readPref("collection.sort", Object.keys(SORTS) as Sort[], "name"),
  );
  const [openId, setOpenId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  const load = async () => {
    const [g, l, m] = await Promise.all([listGames(), listLists(), listMemberships()]);
    setGames(g);
    setLists(l);
    setMembers(new Set(m.map((x) => key(x.game_id, x.list_id))));
  };

  // Roda a ação, recarrega tudo e mostra erro na tela.
  const run = (action: () => Promise<unknown>) => async () => {
    setError(null);
    try {
      await action();
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  useEffect(() => {
    run(async () => {})();
  }, []);

  // Busca na Steam 300 ms depois que o usuário para de digitar.
  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let stale = false;
    const timer = setTimeout(() => {
      searchSteam(q)
        .then((r) => !stale && setResults(r))
        .catch((e) => !stale && setError(String(e)));
    }, 300);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [term]);

  useEffect(() => savePref("collection.view", view), [view]);
  useEffect(() => savePref("collection.sort", sort), [sort]);

  // Abre/fecha o modal de detalhes junto com openId.
  useEffect(() => {
    if (openId == null) dialog.current?.close();
    else if (!dialog.current?.open) dialog.current?.showModal();
  }, [openId]);

  const pickGame = (name: string, app: SteamApp | null) =>
    run(async () => {
      await addGame(name, app);
      setTerm("");
    })();

  // Enter sem escolher sugestão adiciona só pelo nome (jogo fora da Steam).
  const onAddGame = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (term.trim()) pickGame(term.trim(), null);
  };

  const onAddList = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get("name") ?? "").trim();
    if (!name) return;
    run(async () => {
      await addList(name);
      form.reset();
    })();
  };

  const onDeleteList = (list: List) => {
    if (filter === list.id) setFilter(null);
    run(() => deleteList(list.id))();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await run(refreshPrices)();
    setRefreshing(false);
  };

  const BACKUP_FILTER = [{ name: "Backup do Collection", extensions: ["json"] }];

  const onExport = run(async () => {
    const day = new Date().toISOString().slice(0, 10);
    const path = await save({ defaultPath: `collection-backup-${day}.json`, filters: BACKUP_FILTER });
    if (path) await writeTextFile(path, await exportBackup());
  });

  const onImport = run(async () => {
    const path = await open({ multiple: false, directory: false, filters: BACKUP_FILTER });
    if (!path) return;
    const backup = parseBackup(await readTextFile(path));
    const ok = await ask(
      `Isso substitui todos os jogos e listas atuais pelos do backup (${backup.games.length} jogos). Continuar?`,
      { title: "Importar backup", kind: "warning" },
    );
    if (!ok) return;
    setFilter(null);
    await restoreBackup(backup);
  });

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
        (filter == null || inList(g.id, filter)) &&
        (!statusFilter || g.status === statusFilter) &&
        g.name.toLowerCase().includes(name),
    ),
    sort,
  );
  const title = filter == null ? "Todos os jogos" : (lists.find((l) => l.id === filter)?.name ?? "");
  const opened = games.find((g) => g.id === openId);

  const statusSelect = (game: Game) => (
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

  const ratingSelect = (game: Game) => (
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

  const listChips = (game: Game) => {
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
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">Collection</div>

        <nav>
          <button className={filter == null ? "nav active" : "nav"} onClick={() => setFilter(null)}>
            <span>Todos os jogos</span>
            <span className="count">{games.length}</span>
          </button>

          <h3>Listas</h3>
          {lists.map((list) => (
            <div key={list.id} className="nav-row">
              <button
                className={filter === list.id ? "nav active" : "nav"}
                onClick={() => setFilter(list.id)}
              >
                <span>{list.name}</span>
                <span className="count">{listCount(list.id)}</span>
              </button>
              <button
                className="nav-remove"
                onClick={() => onDeleteList(list)}
                aria-label={`Apagar lista ${list.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </nav>

        <form className="new-list" onSubmit={onAddList}>
          <input name="name" placeholder="+ Nova lista" aria-label="Nova lista" required />
        </form>

        <div className="backup">
          <button className="ghost" onClick={onExport}>
            Exportar backup
          </button>
          <button className="ghost" onClick={onImport}>
            Importar backup
          </button>
        </div>
      </aside>

      <main className="main">
        <form className="add-game" onSubmit={onAddGame}>
          <input
            value={term}
            onChange={(e) => setTerm(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Escape" && setTerm("")}
            placeholder="Adicionar jogo: buscar na Steam…"
            required
          />
          <button type="submit" className="ghost">
            Adicionar sem Steam
          </button>

          {results.length > 0 && (
            <ul className="results">
              {results.map((app) => (
                <li key={app.id}>
                  <button type="button" onClick={() => pickGame(app.name, app)}>
                    <img src={app.tiny_image} alt="" />
                    <span className="grow">{app.name}</span>
                    <Price
                      final={app.price?.final ?? null}
                      initial={app.price?.initial ?? null}
                      currency={app.price?.currency ?? null}
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>

        <div className="page-head">
          <h1>{title}</h1>
          <span className="muted">
            {shown.length} {shown.length === 1 ? "jogo" : "jogos"}
          </span>
          <button className="ghost refresh" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? "Atualizando…" : "Atualizar preços"}
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
          <select
            value={sort}
            onChange={(e) => setSort(e.currentTarget.value as Sort)}
            aria-label="Ordenar por"
          >
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
          <p className="empty">
            {games.length === 0 ? "Nenhum jogo ainda. Busque um acima." : "Nenhum jogo aqui."}
          </p>
        ) : view === "cards" ? (
          <div className="grid">
            {shown.map((game) => (
              <button key={game.id} className="game-card" onClick={() => setOpenId(game.id)}>
                <Cover game={game} />
                {discount(game.price_initial, game.price) > 0 && (
                  <span className="sale sale-badge">-{discount(game.price_initial, game.price)}%</span>
                )}
                {game.rating != null && (
                  <span className="badge" data-tier={ratingTier(game.rating)}>
                    {game.rating}
                  </span>
                )}
                <span className="game-card-name">{game.name}</span>
                {game.status && (
                  <span className="status-text" data-status={game.status}>
                    {STATUSES[game.status]}
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
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
              {shown.map((game) => (
                <tr key={game.id}>
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
                  <td>{statusSelect(game)}</td>
                  <td>{ratingSelect(game)}</td>
                  <td>{listChips(game)}</td>
                  <td>
                    <button
                      className="danger"
                      onClick={() => onDeleteGame(game)}
                      aria-label={`Remover ${game.name}`}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>

      <dialog
        ref={dialog}
        className="detail"
        onClose={() => setOpenId(null)}
        onClick={(e) => e.target === e.currentTarget && setOpenId(null)}
      >
        {opened && (
          <>
            <div className="detail-body">
              <Cover key={opened.id} game={opened} />
              <div className="detail-info">
                <h2>{opened.name}</h2>
                <p>
                  <Price final={opened.price} initial={opened.price_initial} currency={opened.currency} />
                </p>

                <label className="field">
                  <span>Status</span>
                  {statusSelect(opened)}
                </label>
                <label className="field">
                  <span>Nota</span>
                  {ratingSelect(opened)}
                </label>
                <div className="field">
                  <span>Listas</span>
                  {listChips(opened)}
                </div>
              </div>
            </div>
            <div className="detail-notes">
              <h3>Anotações</h3>
              <NotesEditor
                gameId={opened.id}
                initial={opened.notes ?? ""}
                onSave={(text) => run(() => setNotes(opened.id, text))()}
              />
            </div>
            <div className="detail-actions">
              <button className="danger" onClick={() => onDeleteGame(opened)}>
                Remover jogo
              </button>
              <button className="ghost" onClick={() => setOpenId(null)}>
                Fechar
              </button>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}

export default App;
