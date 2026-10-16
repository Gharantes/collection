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
  assert.deepEqual(s.byStatus, { backlog: 0, playing: 1, finished: 2 });
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
