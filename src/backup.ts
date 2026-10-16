import type { Game, List, Membership, StatusEvent } from "./db";

export type Backup = {
  app: "collection";
  version: 1;
  games: Game[];
  lists: List[];
  game_lists: Membership[];
  status_events: StatusEvent[];
};

const STATUSES = ["backlog", "playing", "finished"];

const isInt = (v: unknown) => Number.isInteger(v);
const isIntOrNull = (v: unknown) => v == null || Number.isInteger(v);
const isStrOrNull = (v: unknown) => v == null || typeof v === "string";

const validGame = (g: Game) =>
  isInt(g.id) &&
  typeof g.name === "string" &&
  (g.rating == null || (isInt(g.rating) && g.rating >= 0 && g.rating <= 10)) &&
  isIntOrNull(g.steam_id) &&
  (g.status == null || STATUSES.includes(g.status)) &&
  isStrOrNull(g.image_url) &&
  isIntOrNull(g.price) &&
  isIntOrNull(g.price_initial) &&
  isStrOrNull(g.currency) &&
  isStrOrNull(g.notes) &&
  (g.launch == null || g.launch === "steam" || g.launch === "exe") &&
  isStrOrNull(g.exe_path);

// Lê e valida o arquivo inteiro antes de qualquer escrita no banco.
export function parseBackup(text: string): Backup {
  let data: Backup;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Arquivo não é um JSON válido.");
  }
  if (data?.app !== "collection" || data.version !== 1) throw new Error("Arquivo não é um backup do Collection.");
  if (!Array.isArray(data.games) || !data.games.every(validGame)) throw new Error("Backup com jogos inválidos.");
  if (!Array.isArray(data.lists) || !data.lists.every((l) => isInt(l.id) && typeof l.name === "string"))
    throw new Error("Backup com listas inválidas.");

  const gameIds = new Set(data.games.map((g) => g.id));
  const listIds = new Set(data.lists.map((l) => l.id));
  const listNames = new Set(data.lists.map((l) => l.name));
  const steamIds = data.games.map((g) => g.steam_id).filter((id) => id != null);
  if (gameIds.size !== data.games.length || listIds.size !== data.lists.length || listNames.size !== data.lists.length)
    throw new Error("Backup com ids ou nomes de lista repetidos.");
  if (new Set(steamIds).size !== steamIds.length) throw new Error("Backup com jogo da Steam repetido.");
  if (!Array.isArray(data.game_lists) || !data.game_lists.every((m) => gameIds.has(m.game_id) && listIds.has(m.list_id)))
    throw new Error("Backup com vínculos inválidos entre jogos e listas.");
  // Backups antigos não têm histórico.
  data.status_events ??= [];
  if (
    !Array.isArray(data.status_events) ||
    !data.status_events.every(
      (e) => gameIds.has(e.game_id) && STATUSES.includes(e.status) && /^\d{4}-\d{2}-\d{2}$/.test(e.at),
    )
  )
    throw new Error("Backup com histórico de status inválido.");
  return data;
}
