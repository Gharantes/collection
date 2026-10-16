import Database from "@tauri-apps/plugin-sql";
import { fetchPrices, type SteamApp } from "./steam";

export type Status = "backlog" | "playing" | "finished";
export type Game = {
  id: number;
  name: string;
  rating: number | null;
  steam_id: number | null;
  status: Status | null;
  image_url: string | null;
  price: number | null;
  price_initial: number | null;
  currency: string | null;
  notes: string | null;
};
export type List = { id: number; name: string };
export type Membership = { game_id: number; list_id: number };

// Mesma URL das migrations em src-tauri/src/lib.rs.
let db: Promise<Database> | null = null;

export const getDb = () => (db ??= Database.load("sqlite:collection.db"));

export const listGames = async () =>
  (await getDb()).select<Game[]>("SELECT * FROM games ORDER BY name");

// Sem `app`, o jogo entra só pelo nome (fora da Steam).
export const addGame = async (name: string, app: SteamApp | null = null) =>
  (await getDb()).execute(
    `INSERT INTO games (name, steam_id, image_url, price, price_initial, currency)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      name,
      app?.id ?? null,
      app?.tiny_image ?? null,
      app?.price?.final ?? null,
      app?.price?.initial ?? null,
      app?.price?.currency ?? null,
    ],
  );

// Busca o preço atual de todos os jogos da Steam e preenche imagens que faltam.
export const refreshPrices = async () => {
  const database = await getDb();
  const games = (await listGames()).filter((g) => g.steam_id != null);
  const prices = await fetchPrices(games.map((g) => g.steam_id!));
  for (const game of games) {
    const id = game.steam_id!;
    if (!(id in prices)) continue;
    const p = prices[id];
    await database.execute(
      `UPDATE games SET price = $1, price_initial = $2, currency = $3,
         image_url = COALESCE(image_url, $4)
       WHERE id = $5`,
      [
        p?.final ?? null,
        p?.initial ?? null,
        p?.currency ?? null,
        `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${id}/capsule_231x87.jpg`,
        game.id,
      ],
    );
  }
};

export const deleteGame = async (id: number) =>
  (await getDb()).execute("DELETE FROM games WHERE id = $1", [id]);

export const setRating = async (id: number, rating: number | null) =>
  (await getDb()).execute("UPDATE games SET rating = $1 WHERE id = $2", [rating, id]);

export const setStatus = async (id: number, status: Status | null) =>
  (await getDb()).execute("UPDATE games SET status = $1 WHERE id = $2", [status, id]);

export const setNotes = async (id: number, notes: string) =>
  (await getDb()).execute("UPDATE games SET notes = $1 WHERE id = $2", [notes || null, id]);

export const listLists = async () =>
  (await getDb()).select<List[]>("SELECT * FROM lists ORDER BY name");

export const addList = async (name: string) =>
  (await getDb()).execute("INSERT INTO lists (name) VALUES ($1)", [name]);

export const deleteList = async (id: number) =>
  (await getDb()).execute("DELETE FROM lists WHERE id = $1", [id]);

export const listMemberships = async () =>
  (await getDb()).select<Membership[]>("SELECT * FROM game_lists");

// Coloca ou tira o jogo da lista.
export const setMembership = async (gameId: number, listId: number, member: boolean) =>
  (await getDb()).execute(
    member
      ? "INSERT OR IGNORE INTO game_lists (game_id, list_id) VALUES ($1, $2)"
      : "DELETE FROM game_lists WHERE game_id = $1 AND list_id = $2",
    [gameId, listId],
  );
