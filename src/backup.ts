import type { Game, GameLink, List, Membership, Note, PlaySession, SavedFilter, StatusDef, StatusEvent } from "./db";

export type Backup = {
  app: "collection";
  version: 1;
  statuses: StatusDef[];
  filters: SavedFilter[];
  games: Game[];
  lists: List[];
  game_lists: Membership[];
  status_events: StatusEvent[];
  play_sessions: PlaySession[];
  notes: Note[];
  links: GameLink[];
};

// Backups antigos não têm a lista de status: usam os de fábrica.
export const DEFAULT_STATUSES: StatusDef[] = [
  { key: "backlog", label: "Backlog" },
  { key: "playing", label: "Jogando" },
  { key: "finished", label: "Terminado" },
  { key: "abandoned", label: "Abandonado" },
];

const isInt = (v: unknown) => Number.isInteger(v);
const isIntOrNull = (v: unknown) => v == null || Number.isInteger(v);
const isStrOrNull = (v: unknown) => v == null || typeof v === "string";

const validGame = (statuses: Set<string>) => (g: Game) =>
  isInt(g.id) &&
  typeof g.name === "string" &&
  (g.rating == null || (isInt(g.rating) && g.rating >= 0 && g.rating <= 10)) &&
  isIntOrNull(g.steam_id) &&
  (g.status == null || statuses.has(g.status)) &&
  isStrOrNull(g.image_url) &&
  isIntOrNull(g.price) &&
  isIntOrNull(g.price_initial) &&
  isStrOrNull(g.currency) &&
  isStrOrNull(g.notes) &&
  (g.launch == null || g.launch === "steam" || g.launch === "exe") &&
  isStrOrNull(g.exe_path) &&
  isIntOrNull(g.target_price) &&
  isStrOrNull(g.save_path) &&
  (g.release_stage == null || g.release_stage === "early_access" || g.release_stage === "pre_release") &&
  isStrOrNull(g.release_date) &&
  (g.achievements == null || g.achievements === "hunting" || g.achievements === "platinum") &&
  (g.owned == null || g.owned === 0 || g.owned === 1) &&
  isIntOrNull(g.demo_steam_id) &&
  (g.news == null || g.news === 0 || g.news === 1) &&
  (g.target_discount == null || (isInt(g.target_discount) && g.target_discount >= 1 && g.target_discount <= 100));

// Lê e valida o arquivo inteiro antes de qualquer escrita no banco.
export function parseBackup(text: string): Backup {
  let data: Backup;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Arquivo não é um JSON válido.");
  }
  if (data?.app !== "collection" || data.version !== 1) throw new Error("Arquivo não é um backup do Collection.");
  data.statuses ??= DEFAULT_STATUSES;
  if (
    !Array.isArray(data.statuses) ||
    !data.statuses.every((s) => typeof s.key === "string" && typeof s.label === "string")
  )
    throw new Error("Backup com status inválidos.");
  const statuses = new Set(data.statuses.map((s) => s.key));
  if (statuses.size !== data.statuses.length || new Set(data.statuses.map((s) => s.label)).size !== statuses.size)
    throw new Error("Backup com status repetidos.");
  data.filters ??= [];
  if (
    !Array.isArray(data.filters) ||
    !data.filters.every((f) => typeof f.name === "string" && typeof f.filter === "string") ||
    new Set(data.filters.map((f) => f.name)).size !== data.filters.length
  )
    throw new Error("Backup com filtros salvos inválidos.");
  if (!Array.isArray(data.games) || !data.games.every(validGame(statuses))) throw new Error("Backup com jogos inválidos.");
  if (!Array.isArray(data.lists) || !data.lists.every((l) => isInt(l.id) && typeof l.name === "string"))
    throw new Error("Backup com listas inválidas.");

  const gameIds = new Set(data.games.map((g) => g.id));
  const listIds = new Set(data.lists.map((l) => l.id));
  const listNames = new Set(data.lists.map((l) => l.name));
  const steamIds = data.games.map((g) => g.steam_id).filter((id) => id != null);
  if (gameIds.size !== data.games.length || listIds.size !== data.lists.length || listNames.size !== data.lists.length)
    throw new Error("Backup com ids ou nomes de lista repetidos.");
  if (new Set(steamIds).size !== steamIds.length) throw new Error("Backup com jogo da Steam repetido.");
  const demoIds = data.games.map((g) => g.demo_steam_id).filter((id) => id != null);
  if (new Set(demoIds).size !== demoIds.length) throw new Error("Backup com demo repetida.");
  if (!Array.isArray(data.game_lists) || !data.game_lists.every((m) => gameIds.has(m.game_id) && listIds.has(m.list_id)))
    throw new Error("Backup com vínculos inválidos entre jogos e listas.");
  data.status_events ??= [];
  if (
    !Array.isArray(data.status_events) ||
    !data.status_events.every(
      (e) => gameIds.has(e.game_id) && statuses.has(e.status) && /^\d{4}-\d{2}-\d{2}$/.test(e.at),
    )
  )
    throw new Error("Backup com histórico de status inválido.");
  data.play_sessions ??= [];
  if (
    !Array.isArray(data.play_sessions) ||
    !data.play_sessions.every(
      (s) => gameIds.has(s.game_id) && typeof s.started_at === "string" && isInt(s.seconds) && s.seconds >= 0,
    )
  )
    throw new Error("Backup com sessões de jogo inválidas.");
  // Backups antigos têm uma anotação só, em games.notes.
  data.notes ??= data.games
    .filter((g) => g.notes)
    .map((g, i) => ({ id: i + 1, game_id: g.id, title: "Anotações", body: g.notes!, image: null }));
  if (
    !Array.isArray(data.notes) ||
    !data.notes.every(
      (n) =>
        gameIds.has(n.game_id) && typeof n.title === "string" && typeof n.body === "string" && isStrOrNull(n.image),
    )
  )
    throw new Error("Backup com anotações inválidas.");
  data.links ??= [];
  if (!Array.isArray(data.links) || !data.links.every((l) => gameIds.has(l.game_id) && typeof l.url === "string"))
    throw new Error("Backup com links inválidos.");
  return data;
}
