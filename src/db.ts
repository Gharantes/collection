import Database from "@tauri-apps/plugin-sql";
import { capsule, fetchItems, fetchPrices, fetchRelease, type SteamApp } from "./steam";
import type { Backup } from "./backup";

// Chave de um status registrado (os de fábrica: backlog, playing, finished, abandoned).
export type Status = string;
export type StatusDef = { key: Status; label: string };
export type Launch = "steam" | "exe";
export type ReleaseStage = "early_access" | "pre_release";
export type Achievements = "hunting" | "platinum";
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
  launch: Launch | null;
  exe_path: string | null;
  target_price: number | null;
  target_discount: number | null;
  save_path: string | null;
  release_stage: ReleaseStage | null;
  release_date: string | null;
  achievements: Achievements | null;
  owned: 0 | 1;
  // Demo na Steam; o tempo jogado nela conta para este jogo.
  demo_steam_id: number | null;
  // Buscar notícias da Steam na página do jogo.
  news: 0 | 1;
};
export type List = { id: number; name: string };
export type StatusEvent = { id: number; game_id: number; status: Status; at: string };
export type PlaySession = { id: number; game_id: number; started_at: string; seconds: number };
export type Membership = { game_id: number; list_id: number };
export type Note = { id: number; game_id: number; title: string; body: string; image: string | null };
export type SavedFilter = { id: number; name: string; filter: string };
export type GameLink = { id: number; game_id: number; url: string };

// Mesma URL das migrations em src-tauri/src/lib.rs.
let db: Promise<Database> | null = null;

export const getDb = () => (db ??= Database.load("sqlite:collection.db"));

export const listGames = async () =>
  (await getDb()).select<Game[]>("SELECT * FROM games ORDER BY name");

// Sem `app`, o jogo entra só pelo nome (fora da Steam).
export const addGame = async (name: string, app: SteamApp | null = null, demo: number | null = null) =>
  (await getDb()).execute(
    `INSERT INTO games (name, steam_id, image_url, price, price_initial, currency, demo_steam_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      name,
      app?.id ?? null,
      app?.tiny_image ?? null,
      app?.price?.final ?? null,
      app?.price?.initial ?? null,
      app?.price?.currency ?? null,
      demo,
    ],
  );

export const gameBySteamId = async (steamId: number) =>
  (await (await getDb()).select<Game[]>("SELECT * FROM games WHERE steam_id = $1", [steamId]))[0] ?? null;

export const setDemo = async (id: number, demo: number | null) =>
  (await getDb()).execute("UPDATE games SET demo_steam_id = $1 WHERE id = $2", [demo, id]);

// Progresso de uma atualização: quantos jogos já foram pesquisados de quantos.
export type Progress = (done: number, total: number) => void;

// Busca o preço atual de todos os jogos da Steam e preenche imagens que faltam.
export const refreshPrices = async (onProgress?: Progress) => {
  const database = await getDb();
  const games = (await listGames()).filter((g) => g.steam_id != null);
  onProgress?.(0, games.length);
  const prices = await fetchPrices(
    games.map((g) => g.steam_id!),
    (done) => onProgress?.(done, games.length),
  );
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
        capsule(id),
        game.id,
      ],
    );
  }
};

// Confere na Steam os jogos marcados como Early Access/Pre-release e atualiza o estado e a release date.
// Jogos que falharam (sem internet, erro da Steam) ficam como estão.
export const refreshReleases = async (onProgress?: Progress) => {
  const database = await getDb();
  const games = (await listGames()).filter((g) => g.steam_id != null && g.release_stage != null);
  onProgress?.(0, games.length);
  for (const [i, game] of games.entries()) {
    const r = await fetchRelease(game.steam_id!).catch(() => null);
    onProgress?.(i + 1, games.length);
    if (!r) continue;
    await database.execute("UPDATE games SET release_stage = $1 WHERE id = $2", [r.stage, game.id]);
    if (r.stage === "pre_release" && r.date)
      await database.execute("UPDATE games SET release_date = $1 WHERE id = $2", [r.date, game.id]);
  }
};

// Confere na Steam se os jogos que o usuário não tem ganharam ou perderam a demo.
export const refreshDemos = async (onProgress?: Progress) => {
  const games = (await listGames()).filter((g) => g.steam_id != null && !g.owned);
  onProgress?.(0, games.length);
  const items = await fetchItems(
    games.map((g) => g.steam_id!),
    (done) => onProgress?.(done, games.length),
  );
  for (const game of games) {
    const item = items[game.steam_id!];
    // Página que ainda é a própria demo fica para o "Juntar demos".
    if (!item || item.fullgame != null || item.demo === game.demo_steam_id) continue;
    await setDemo(game.id, item.demo);
  }
};

// Junta as páginas de demo com a do jogo completo. Se ele está na biblioteca, recebe as sessões, anotações,
// links e listas da demo (status, histórico e nota só se não tiver) e a página da demo é apagada; senão,
// a própria página vira a do jogo completo. Também marca a demo dos jogos que têm uma e estão sem.
export const mergeDemos = async (onProgress?: BackupProgress) => {
  const database = await getDb();
  const games = (await listGames()).filter((g) => g.steam_id != null);
  onProgress?.("Consultando a Steam", 0, games.length);
  const items = await fetchItems(
    games.map((g) => g.steam_id!),
    (done) => onProgress?.("Consultando a Steam", done, games.length),
  );
  const fullOf = (g: Game) => items[g.steam_id!]?.fullgame ?? null;

  let found = 0;
  for (const g of games) {
    const demo = items[g.steam_id!]?.demo;
    if (fullOf(g) != null || demo == null || g.demo_steam_id != null) continue;
    await setDemo(g.id, demo);
    found++;
  }

  const demos = games.filter((g) => fullOf(g) != null);
  const bySteam = new Map(games.map((g) => [g.steam_id!, g]));
  const missing = [...new Set(demos.map((d) => fullOf(d)!).filter((id) => !bySteam.has(id)))];
  onProgress?.("Buscando os jogos completos", 0, 1);
  const full = missing.length ? await fetchItems(missing) : {};
  const prices = missing.length ? await fetchPrices(missing) : {};

  let merged = 0;
  let converted = 0;
  for (const [i, demo] of demos.entries()) {
    onProgress?.("Juntando demos", i, demos.length);
    const fullId = fullOf(demo)!;
    const target = bySteam.get(fullId);
    if (target) {
      for (const table of ["play_sessions", "game_notes", "game_links"])
        await database.execute(`UPDATE ${table} SET game_id = $1 WHERE game_id = $2`, [target.id, demo.id]);
      await database.execute(
        "INSERT OR IGNORE INTO game_lists (game_id, list_id) SELECT $1, list_id FROM game_lists WHERE game_id = $2",
        [target.id, demo.id],
      );
      const history = await database.select<unknown[]>("SELECT 1 FROM status_events WHERE game_id = $1 LIMIT 1", [target.id]);
      if (history.length === 0)
        await database.execute("UPDATE status_events SET game_id = $1 WHERE game_id = $2", [target.id, demo.id]);
      await deleteGame(demo.id);
      await database.execute(
        "UPDATE games SET status = COALESCE(status, $1), rating = COALESCE(rating, $2), demo_steam_id = $3 WHERE id = $4",
        [demo.status, demo.rating, demo.steam_id, target.id],
      );
      merged++;
    } else {
      const p = prices[fullId];
      // Vinculada pela Steam abriria o jogo completo, que não está instalado.
      await database.execute(
        `UPDATE games SET steam_id = $1, demo_steam_id = $2, name = $3, image_url = $4,
           price = $5, price_initial = $6, currency = $7,
           launch = CASE launch WHEN 'steam' THEN NULL ELSE launch END
         WHERE id = $8`,
        [
          fullId,
          demo.steam_id,
          full[fullId]?.name ?? demo.name.replace(/\s+demo$/i, ""),
          capsule(fullId),
          p?.final ?? null,
          p?.initial ?? null,
          p?.currency ?? null,
          demo.id,
        ],
      );
      const r = await fetchRelease(fullId).catch(() => null);
      if (r) {
        await database.execute("UPDATE games SET release_stage = $1 WHERE id = $2", [r.stage, demo.id]);
        if (r.stage === "pre_release" && r.date)
          await database.execute("UPDATE games SET release_date = $1 WHERE id = $2", [r.date, demo.id]);
      }
      bySteam.set(fullId, { ...demo, steam_id: fullId });
      converted++;
    }
  }
  onProgress?.("Juntando demos", demos.length, demos.length);
  if (!demos.length && !found) return "Nenhuma demo encontrada.";
  return `${merged} demos juntadas ao jogo completo, ${converted} viraram a página do jogo completo e ${found} jogos ganharam demo.`;
};

export const deleteGame = async (id: number) =>
  (await getDb()).execute("DELETE FROM games WHERE id = $1", [id]);

export const setRating = async (id: number, rating: number | null) =>
  (await getDb()).execute("UPDATE games SET rating = $1 WHERE id = $2", [rating, id]);

// Data local de hoje, AAAA-MM-DD.
const today = () => new Date().toLocaleDateString("sv-SE");

// Muda o status e registra a mudança no histórico.
export const setStatus = async (id: number, status: Status | null) => {
  const database = await getDb();
  await database.execute("UPDATE games SET status = $1 WHERE id = $2", [status, id]);
  if (status)
    await database.execute("INSERT INTO status_events (game_id, status, at) VALUES ($1, $2, $3)", [
      id,
      status,
      today(),
    ]);
};

export const listStatuses = async () =>
  (await getDb()).select<StatusDef[]>("SELECT * FROM statuses ORDER BY rowid");

export const addStatus = async (label: string) =>
  (await getDb()).execute("INSERT INTO statuses (key, label) VALUES ($1, $2)", [crypto.randomUUID(), label]);

// Os jogos com esse status ficam sem status e o histórico dele é apagado (ON DELETE no banco).
export const deleteStatus = async (key: Status) =>
  (await getDb()).execute("DELETE FROM statuses WHERE key = $1", [key]);

export const listSavedFilters = async () =>
  (await getDb()).select<SavedFilter[]>("SELECT * FROM saved_filters ORDER BY name");

// Com um nome que já existe, troca o filtro dele.
export const saveFilter = async (name: string, filter: string) =>
  (await getDb()).execute(
    "INSERT INTO saved_filters (name, filter) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET filter = excluded.filter",
    [name, filter],
  );

export const deleteSavedFilter = async (id: number) =>
  (await getDb()).execute("DELETE FROM saved_filters WHERE id = $1", [id]);

export const listStatusEvents = async () =>
  (await getDb()).select<StatusEvent[]>("SELECT * FROM status_events ORDER BY at, id");

export const listPlaySessions = async () =>
  (await getDb()).select<PlaySession[]>("SELECT * FROM play_sessions ORDER BY started_at");

export const addPlaySession = async (gameId: number, startedAt: number, seconds: number) =>
  (await getDb()).execute("INSERT INTO play_sessions (game_id, started_at, seconds) VALUES ($1, $2, $3)", [
    gameId,
    new Date(startedAt).toISOString(),
    seconds,
  ]);

export const setEventDate = async (id: number, at: string) =>
  (await getDb()).execute("UPDATE status_events SET at = $1 WHERE id = $2", [at, id]);

export const deleteEvent = async (id: number) =>
  (await getDb()).execute("DELETE FROM status_events WHERE id = $1", [id]);

export const listNotes = async (gameId?: number) =>
  (await getDb()).select<Note[]>(
    gameId == null ? "SELECT * FROM game_notes ORDER BY id" : "SELECT * FROM game_notes WHERE game_id = $1 ORDER BY id",
    gameId == null ? [] : [gameId],
  );

export const addNote = async (gameId: number, title = "Untitled", image: string | null = null) =>
  (await getDb()).execute("INSERT INTO game_notes (game_id, title, image) VALUES ($1, $2, $3)", [gameId, title, image]);

export const setNoteTitle = async (id: number, title: string) =>
  (await getDb()).execute("UPDATE game_notes SET title = $1 WHERE id = $2", [title.trim() || "Untitled", id]);

export const setNoteBody = async (id: number, body: string) =>
  (await getDb()).execute("UPDATE game_notes SET body = $1 WHERE id = $2", [body, id]);

export const deleteNote = async (id: number) =>
  (await getDb()).execute("DELETE FROM game_notes WHERE id = $1", [id]);

export const listLinks = async (gameId?: number) =>
  (await getDb()).select<GameLink[]>(
    gameId == null ? "SELECT * FROM game_links ORDER BY id" : "SELECT * FROM game_links WHERE game_id = $1 ORDER BY id",
    gameId == null ? [] : [gameId],
  );

export const addLink = async (gameId: number, url: string) =>
  (await getDb()).execute("INSERT INTO game_links (game_id, url) VALUES ($1, $2)", [gameId, url]);

export const deleteLink = async (id: number) =>
  (await getDb()).execute("DELETE FROM game_links WHERE id = $1", [id]);

export const setLaunch = async (id: number, launch: Launch | null, exePath: string | null = null) =>
  (await getDb()).execute("UPDATE games SET launch = $1, exe_path = $2 WHERE id = $3", [launch, exePath, id]);

export const setTarget = async (id: number, price: number | null, discount: number | null) =>
  (await getDb()).execute("UPDATE games SET target_price = $1, target_discount = $2 WHERE id = $3", [
    price,
    discount,
    id,
  ]);

export const setSavePath = async (id: number, path: string | null) =>
  (await getDb()).execute("UPDATE games SET save_path = $1 WHERE id = $2", [path, id]);

export const setReleaseStage = async (id: number, stage: ReleaseStage | null) =>
  (await getDb()).execute("UPDATE games SET release_stage = $1 WHERE id = $2", [stage, id]);

export const setReleaseDate = async (id: number, date: string | null) =>
  (await getDb()).execute("UPDATE games SET release_date = $1 WHERE id = $2", [date, id]);

export const setAchievements = async (id: number, goal: Achievements | null) =>
  (await getDb()).execute("UPDATE games SET achievements = $1 WHERE id = $2", [goal, id]);

export const setOwned = async (id: number, owned: boolean) =>
  (await getDb()).execute("UPDATE games SET owned = $1 WHERE id = $2", [owned ? 1 : 0, id]);

export const setNews = async (id: number, news: boolean) =>
  (await getDb()).execute("UPDATE games SET news = $1 WHERE id = $2", [news ? 1 : 0, id]);

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

// Colunas de games restauradas do backup; ausentes no arquivo viram NULL (owned e news viram 0).
const GAME_COLUMNS = [
  "id",
  "name",
  "rating",
  "steam_id",
  "status",
  "image_url",
  "price",
  "price_initial",
  "currency",
  "launch",
  "exe_path",
  "target_price",
  "target_discount",
  "save_path",
  "release_stage",
  "release_date",
  "achievements",
  "owned",
  "demo_steam_id",
  "news",
];

// Avisa o andamento de exportBackup/restoreBackup: etapa atual e quantas já terminaram.
export type BackupProgress = (label: string, done: number, total: number) => void;

export const exportBackup = async (onProgress?: BackupProgress): Promise<string> => {
  const total = 9;
  let done = 0;
  const tick = <T,>(read: Promise<T>) =>
    read.then((rows) => {
      onProgress?.("Lendo dados", ++done, total);
      return rows;
    });
  onProgress?.("Lendo dados", done, total);
  const [statuses, filters, games, lists, game_lists, status_events, play_sessions, notes, links] = await Promise.all([
    tick(listStatuses()),
    tick(listSavedFilters()),
    tick(listGames()),
    tick(listLists()),
    tick(listMemberships()),
    tick(listStatusEvents()),
    tick(listPlaySessions()),
    tick(listNotes()),
    tick(listLinks()),
  ]);
  const backup: Backup = { app: "collection", version: 1, statuses, filters, games, lists, game_lists, status_events, play_sessions, notes, links };
  return JSON.stringify(backup, null, 2);
};

// Troca todos os dados pelos do backup. Sem transação: validar antes com parseBackup.
// Apaga a biblioteca inteira (jogos, listas e tudo que depende deles).
export const resetLibrary = async () => {
  const database = await getDb();
  for (const table of ["game_links", "game_notes", "play_sessions", "status_events", "game_lists", "games", "lists"]) {
    await database.execute(`DELETE FROM ${table}`);
  }
};

export const restoreBackup = async (backup: Backup, onProgress?: BackupProgress) => {
  const database = await getDb();
  const json = JSON.stringify;
  const steps: [string, unknown[]?][] = [
    ["DELETE FROM game_lists"],
    ["DELETE FROM games"],
    ["DELETE FROM lists"],
    ["DELETE FROM statuses"],
    ["INSERT INTO statuses (key, label) SELECT value->>'key', value->>'label' FROM json_each($1)", [json(backup.statuses)]],
    ["DELETE FROM saved_filters"],
    [
      "INSERT INTO saved_filters (name, filter) SELECT value->>'name', value->>'filter' FROM json_each($1)",
      [json(backup.filters)],
    ],
    ["INSERT INTO lists (id, name) SELECT value->>'id', value->>'name' FROM json_each($1)", [json(backup.lists)]],
    [
      `INSERT INTO games (${GAME_COLUMNS.join(", ")})
     SELECT ${GAME_COLUMNS.map((c) => (c === "owned" || c === "news" ? `COALESCE(value->>'${c}', 0)` : `value->>'${c}'`)).join(", ")}
     FROM json_each($1)`,
      [json(backup.games)],
    ],
    [
      "INSERT INTO game_lists (game_id, list_id) SELECT value->>'game_id', value->>'list_id' FROM json_each($1)",
      [json(backup.game_lists)],
    ],
    [
      `INSERT INTO status_events (game_id, status, at)
     SELECT value->>'game_id', value->>'status', value->>'at' FROM json_each($1)`,
      [json(backup.status_events)],
    ],
    [
      `INSERT INTO play_sessions (game_id, started_at, seconds)
     SELECT value->>'game_id', value->>'started_at', value->>'seconds' FROM json_each($1)`,
      [json(backup.play_sessions)],
    ],
    [
      `INSERT INTO game_notes (game_id, title, body, image)
     SELECT value->>'game_id', value->>'title', value->>'body', value->>'image' FROM json_each($1)`,
      [json(backup.notes)],
    ],
    ["INSERT INTO game_links (game_id, url) SELECT value->>'game_id', value->>'url' FROM json_each($1)", [json(backup.links)]],
  ];
  for (const [i, [sql, params]] of steps.entries()) {
    onProgress?.("Gravando dados", i, steps.length);
    await database.execute(sql, params);
  }
  onProgress?.("Gravando dados", steps.length, steps.length);
};
