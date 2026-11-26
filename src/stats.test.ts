import { test } from "node:test";
import assert from "node:assert/strict";
import type { Game, PlaySession, StatusEvent } from "./db";
import { computeStats } from "./stats.ts";

test("estatísticas da coleção", () => {
  const games = [
    { id: 1, name: "A", rating: 8, status: "finished", price: 1000 },
    { id: 2, name: "B", rating: 6, status: "playing", price: 500 },
    { id: 3, name: "C", rating: null, status: "finished", price: null },
  ] as Game[];
  const ev = (game_id: number, status: StatusEvent["status"], at: string) => ({ id: 0, game_id, status, at });
  const events = [ev(1, "playing", "2024-01-01"), ev(1, "finished", "2024-01-11"), ev(3, "finished", "2026-05-01")];
  const sessions = [
    { game_id: 2, seconds: 7200 },
    { game_id: 1, seconds: 3600 },
    { game_id: 2, seconds: 1800 },
  ] as PlaySession[];

  const s = computeStats(games, events, sessions);
  assert.deepEqual(s.byStatus, { backlog: 0, playing: 1, finished: 2, abandoned: 0 });
  assert.equal(s.avgRating, 7);
  assert.equal(s.avgDaysToFinish, 10);
  assert.equal(s.value, 1500);
  assert.equal(s.playedSeconds, 12600);
  assert.deepEqual(s.finishedByYear, [
    { year: 2024, count: 1 },
    { year: 2025, count: 0 },
    { year: 2026, count: 1 },
  ]);
  assert.deepEqual(
    s.topPlayed.map((t) => [t.game.name, t.seconds]),
    [
      ["B", 9000],
      ["A", 3600],
    ],
  );
});

test("tempo de jogo do mês, cortado na meia-noite", async () => {
  const { monthPlay } = await import("./stats.ts");
  const at = (d: number, h: number) => new Date(2026, 10, d, h).toISOString();
  const sessions = [
    { game_id: 1, started_at: at(3, 22), seconds: 4 * 3600 }, // 22h do dia 3 até 2h do dia 4
    { game_id: 2, started_at: at(3, 10), seconds: 3600 },
    { game_id: 2, started_at: new Date(2026, 9, 31, 23).toISOString(), seconds: 2 * 3600 }, // começa em outubro
    { game_id: 3, started_at: at(30, 23), seconds: 3 * 3600 }, // termina em dezembro
  ] as PlaySession[];

  const m = monthPlay(sessions, 2026, 10);
  assert.equal(m.days.length, 30);
  assert.deepEqual(m.days[0].segments, [{ gameId: 2, start: 0, end: 60 }]);
  assert.deepEqual(m.days[2].segments, [
    { gameId: 1, start: 1320, end: 1440 },
    { gameId: 2, start: 600, end: 660 },
  ]);
  assert.deepEqual(m.days[3].segments, [{ gameId: 1, start: 0, end: 120 }]);
  assert.equal(m.days[29].seconds, 3600);
  assert.deepEqual(m.perGame, [
    { gameId: 1, seconds: 14400 },
    { gameId: 2, seconds: 7200 },
    { gameId: 3, seconds: 3600 },
  ]);
  assert.equal(m.seconds, 25200);
});
