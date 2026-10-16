import { useEffect, useState } from "react";
import {
  addGame,
  addList,
  deleteGame,
  deleteList,
  listGames,
  listLists,
  listMemberships,
  setMembership,
  setRating,
  setStatus,
  type Game,
  type List,
  type Status,
} from "./db";
import { searchSteam, type SteamApp } from "./steam";
import "./App.css";

const RATINGS = Array.from({ length: 11 }, (_, i) => i);
const STATUSES: Record<Status, string> = {
  backlog: "Backlog",
  playing: "Jogando",
  finished: "Terminado",
};
const key = (gameId: number, listId: number) => `${gameId}:${listId}`;

// Centavos para texto, ex.: 7399 BRL -> "R$ 73,99".
const money = (cents: number | null, currency: string | null) =>
  cents == null || !currency
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);

// Faixa de cor da nota.
const ratingTier = (r: number | null) => (r == null ? "" : r >= 8 ? "good" : r >= 5 ? "ok" : "bad");

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

  // Lê o campo "name" do form, roda a ação e limpa o form.
  const onSubmitName =
    (action: (name: string) => Promise<unknown>) => (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const name = String(new FormData(form).get("name") ?? "").trim();
      if (!name) return;
      run(async () => {
        await action(name);
        form.reset();
      })();
    };

  const onDeleteList = (list: List) => {
    if (filter === list.id) setFilter(null);
    run(() => deleteList(list.id))();
  };

  const name = nameFilter.trim().toLowerCase();
  const shown = games.filter(
    (g) =>
      (filter == null || members.has(key(g.id, filter))) &&
      (!statusFilter || g.status === statusFilter) &&
      g.name.toLowerCase().includes(name),
  );

  return (
    <main className="app">
      <header className="header">
        <h1>Collection</h1>
        <span className="muted">
          {games.length} {games.length === 1 ? "jogo" : "jogos"}
        </span>
      </header>

      {error && <p className="error">{error}</p>}

      <div className="panels">
        <section className="card">
          <h2>Adicionar jogo</h2>
          <form className="row" onSubmit={onAddGame}>
            <input
              className="grow"
              value={term}
              onChange={(e) => setTerm(e.currentTarget.value)}
              placeholder="Buscar jogo na Steam…"
              required
            />
            <button type="submit" className="ghost">
              Adicionar sem Steam
            </button>
          </form>

          {results.length > 0 && (
            <ul className="results">
              {results.map((app) => (
                <li key={app.id}>
                  <button onClick={() => pickGame(app.name, app)}>
                    <img src={app.tiny_image} alt="" />
                    <span className="grow">{app.name}</span>
                    <span className="muted">
                      {money(app.price?.final ?? null, app.price?.currency ?? null)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2>Listas</h2>
          <form className="row" onSubmit={onSubmitName(addList)}>
            <input className="grow" name="name" placeholder="Nova lista" required />
            <button type="submit">Criar</button>
          </form>
          <div className="chips">
            {lists.map((list) => (
              <span key={list.id} className="chip">
                {list.name}
                <button
                  className="chip-remove"
                  onClick={() => onDeleteList(list)}
                  aria-label={`Apagar lista ${list.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </section>
      </div>

      <section>
        <div className="row toolbar">
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
          >
            <option value="">Todos os status</option>
            {Object.entries(STATUSES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={filter ?? ""}
            onChange={(e) => setFilter(e.currentTarget.value ? Number(e.currentTarget.value) : null)}
          >
            <option value="">Todas as listas</option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </div>

        {shown.length === 0 ? (
          <p className="empty">
            {games.length === 0 ? "Nenhum jogo ainda. Busque um acima." : "Nenhum jogo com esses filtros."}
          </p>
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
                  <td className="muted nowrap">{money(game.price, game.currency)}</td>
                  <td>
                    <select
                      className="pill"
                      data-status={game.status ?? ""}
                      value={game.status ?? ""}
                      onChange={(e) => {
                        const v = e.currentTarget.value as Status | "";
                        run(() => setStatus(game.id, v || null))();
                      }}
                    >
                      <option value="">—</option>
                      {Object.entries(STATUSES).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="pill"
                      data-tier={ratingTier(game.rating)}
                      value={game.rating ?? ""}
                      onChange={(e) => {
                        const v = e.currentTarget.value;
                        run(() => setRating(game.id, v === "" ? null : Number(v)))();
                      }}
                    >
                      <option value="">—</option>
                      {RATINGS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className="chips">
                      {lists.map((list) => (
                        <label key={list.id} className="toggle">
                          <input
                            type="checkbox"
                            checked={members.has(key(game.id, list.id))}
                            onChange={(e) =>
                              run(() => setMembership(game.id, list.id, e.currentTarget.checked))()
                            }
                          />
                          {list.name}
                        </label>
                      ))}
                    </div>
                  </td>
                  <td>
                    <button
                      className="danger"
                      onClick={run(() => deleteGame(game.id))}
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
      </section>
    </main>
  );
}

export default App;
