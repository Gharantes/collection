import Database from "@tauri-apps/plugin-sql";

export type Item = { id: number; name: string };

// Mesma URL das migrations em src-tauri/src/lib.rs.
let db: Promise<Database> | null = null;

export const getDb = () => (db ??= Database.load("sqlite:collection.db"));

export const listItems = async () =>
  (await getDb()).select<Item[]>("SELECT * FROM items ORDER BY name");

export const addItem = async (name: string) =>
  (await getDb()).execute("INSERT INTO items (name) VALUES ($1)", [name]);

export const deleteItem = async (id: number) =>
  (await getDb()).execute("DELETE FROM items WHERE id = $1", [id]);
