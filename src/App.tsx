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
  type Game,
  type List,
} from "./db";
import "./App.css";

const RATINGS = Array.from({ length: 11 }, (_, i) => i);
const key = (gameId: number, listId: number) => `${gameId}:${listId}`;

function App() {
  const [games, setGames] = useState<Game[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [members, setMembers] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const shown = filter == null ? games : games.filter((g) => members.has(key(g.id, filter)));

  return (
    <main className="container">
      <h1>Collection</h1>

      {error && <p style={{ color: "tomato" }}>{error}</p>}

      <section>
        <h2>Listas</h2>
        <form className="row" onSubmit={onSubmitName(addList)}>
          <input name="name" placeholder="Nova lista" required />
          <button type="submit">Criar lista</button>
        </form>
        <div className="row chips">
          {lists.map((list) => (
            <span key={list.id} className="chip">
              {list.name}{" "}
              <button onClick={() => onDeleteList(list)} title="Apagar lista">
                ×
              </button>
            </span>
          ))}
        </div>
      </section>

      <section>
        <h2>Jogos</h2>
        <form className="row" onSubmit={onSubmitName(addGame)}>
          <input name="name" placeholder="Nome do jogo" required />
          <button type="submit">Adicionar jogo</button>
        </form>

        <div className="row">
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
          <p>{games.length === 0 ? "Nenhum jogo ainda." : "Nenhum jogo nesta lista."}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Jogo</th>
                <th>Nota</th>
                <th>Listas</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((game) => (
                <tr key={game.id}>
                  <td>{game.name}</td>
                  <td>
                    <select
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
                  <td className="lists">
                    {lists.map((list) => (
                      <label key={list.id}>
                        <input
                          type="checkbox"
                          checked={members.has(key(game.id, list.id))}
                          onChange={(e) =>
                            run(() => setMembership(game.id, list.id, e.currentTarget.checked))()
                          }
                        />{" "}
                        {list.name}
                      </label>
                    ))}
                  </td>
                  <td>
                    <button onClick={run(() => deleteGame(game.id))}>Remover</button>
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
