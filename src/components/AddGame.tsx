import { useEffect, useState } from "react";
import { message } from "@tauri-apps/plugin-dialog";
import { addGame, gameBySteamId, setDemo, setReleaseDate, setReleaseStage } from "../db";
import { capsule, fetchItem, fetchPrices, fetchRelease, searchSteam, type SteamApp, type SteamPrice } from "../steam";
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

  // Vindo da Steam, já marca a demo, Early Access/Pre-release e a release date; sem internet, fica sem.
  // Escolher uma demo adiciona o jogo completo com ela (ou só marca a demo nele, se já está na biblioteca).
  const pick = (name: string, app: SteamApp | null) =>
    run(async () => {
      const item = app && (await fetchItem(app.id));
      let demo = item?.demo ?? null;
      if (app && item?.fullgame != null) {
        const fullId = item.fullgame;
        demo = app.id;
        const owner = await gameBySteamId(fullId);
        if (owner) {
          await setDemo(owner.id, demo);
          setTerm("");
          await message(`${owner.name} já está na biblioteca; a demo foi marcada nele.`, { title: "Demo" });
          return;
        }
        const full = await fetchItem(fullId);
        const prices = await fetchPrices([fullId]).catch((): Record<number, SteamPrice | null> => ({}));
        name = full?.name ?? name.replace(/\s+demo$/i, "");
        app = { id: fullId, name, tiny_image: capsule(fullId), price: prices[fullId] ?? undefined };
      }
      const { lastInsertId: id } = await addGame(name, app, demo);
      setTerm("");
      if (!app || id == null) return;
      const release = await fetchRelease(app.id).catch(() => null);
      if (!release?.stage) return;
      await setReleaseStage(id, release.stage);
      if (release.date) await setReleaseDate(id, release.date);
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
