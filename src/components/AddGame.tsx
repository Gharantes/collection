import { useEffect, useState } from "react";
import { addGame } from "../db";
import { searchSteam, type SteamApp } from "../steam";
import { Price, type Run } from "./common";

// Campo de busca na Steam com sugestões; Enter adiciona só pelo nome.
export function AddGame({ run, onError }: { run: Run; onError: (message: string) => void }) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<SteamApp[]>([]);

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
        .catch((e) => !stale && onError(String(e)));
    }, 300);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [term]);

  const pick = (name: string, app: SteamApp | null) =>
    run(async () => {
      await addGame(name, app);
      setTerm("");
    })();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (term.trim()) pick(term.trim(), null);
  };

  return (
    <form className="add-game" onSubmit={onSubmit}>
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
              <button type="button" onClick={() => pick(app.name, app)}>
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
  );
}
