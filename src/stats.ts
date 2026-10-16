import type { Game, PlaySession, StatusEvent } from "./db";

const DAY_MS = 24 * 60 * 60 * 1000;

export type Stats = {
  total: number;
  byStatus: { backlog: number; playing: number; finished: number };
  avgRating: number | null;
  playedSeconds: number;
  avgDaysToFinish: number | null;
  value: number;
  finishedByYear: { year: number; count: number }[];
  topPlayed: { game: Game; seconds: number }[];
};

export function computeStats(games: Game[], events: StatusEvent[], sessions: PlaySession[]): Stats {
  const rated = games.filter((g) => g.rating != null);
  const count = (status: string) => games.filter((g) => g.status === status).length;

  // Por jogo: primeira vez que começou e última vez que terminou.
  const started = new Map<number, string>();
  const finished = new Map<number, string>();
  for (const e of events) {
    if (e.status === "playing" && !started.has(e.game_id)) started.set(e.game_id, e.at);
    if (e.status === "finished") finished.set(e.game_id, e.at);
  }

  const days = [...finished]
    .filter(([id, end]) => started.has(id) && started.get(id)! <= end)
    .map(([id, end]) => (Date.parse(end) - Date.parse(started.get(id)!)) / DAY_MS);

  // Terminados por ano, incluindo anos sem nenhum no meio.
  const perYear = new Map<number, number>();
  for (const at of finished.values()) {
    const year = Number(at.slice(0, 4));
    perYear.set(year, (perYear.get(year) ?? 0) + 1);
  }
  const years = [...perYear.keys()];
  const finishedByYear = years.length
    ? Array.from({ length: Math.max(...years) - Math.min(...years) + 1 }, (_, i) => {
        const year = Math.min(...years) + i;
        return { year, count: perYear.get(year) ?? 0 };
      })
    : [];

  const perGame = new Map<number, number>();
  for (const s of sessions) perGame.set(s.game_id, (perGame.get(s.game_id) ?? 0) + s.seconds);
  const topPlayed = games
    .filter((g) => perGame.has(g.id))
    .map((game) => ({ game, seconds: perGame.get(game.id)! }))
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 5);

  return {
    total: games.length,
    byStatus: { backlog: count("backlog"), playing: count("playing"), finished: count("finished") },
    avgRating: rated.length ? rated.reduce((s, g) => s + g.rating!, 0) / rated.length : null,
    playedSeconds: [...perGame.values()].reduce((a, b) => a + b, 0),
    avgDaysToFinish: days.length ? days.reduce((a, b) => a + b, 0) / days.length : null,
    value: games.reduce((s, g) => s + (g.price ?? 0), 0),
    finishedByYear,
    topPlayed,
  };
}
