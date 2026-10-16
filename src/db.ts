import Database from "@tauri-apps/plugin-sql";

export type Status = "backlog" | "playing" | "finished";
export type Game = {
  id: number;
  name: string;
  rating: number | null;
  steam_id: number | null;
  status: Status | null;
};
export type List = { id: number; name: string };
export type Membership = { game_id: number; list_id: number };

// Mesma URL das migrations em src-tauri/src/lib.rs.
let db: Promise<Database> | null = null;

export const getDb = () => (db ??= Database.load("sqlite:collection.db"));

export const listGames = async () =>
  (await getDb()).select<Game[]>("SELECT * FROM games ORDER BY name");

export const addGame = async (name: string, steamId: number | null = null) =>
  (await getDb()).execute("INSERT INTO games (name, steam_id) VALUES ($1, $2)", [name, steamId]);

export const deleteGame = async (id: number) =>
  (await getDb()).execute("DELETE FROM games WHERE id = $1", [id]);

export const setRating = async (id: number, rating: number | null) =>
  (await getDb()).execute("UPDATE games SET rating = $1 WHERE id = $2", [rating, id]);

export const setStatus = async (id: number, status: Status | null) =>
  (await getDb()).execute("UPDATE games SET status = $1 WHERE id = $2", [status, id]);

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
