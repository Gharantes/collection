import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBackup } from "./backup.ts";

const game = { id: 1, name: "Hades", rating: 9, steam_id: 1, status: "playing", image_url: null, price: 1, price_initial: 2, currency: "BRL", notes: null };
const backup = { app: "collection", version: 1, games: [game], lists: [{ id: 1, name: "A" }], game_lists: [{ game_id: 1, list_id: 1 }] };
const json = (b: object) => JSON.stringify(b);

test("aceita backup válido", () => {
  assert.equal(parseBackup(json(backup)).games.length, 1);
});

test("recusa backup inválido", () => {
  assert.throws(() => parseBackup("{"));
  assert.throws(() => parseBackup(json({ ...backup, app: "outro" })));
  assert.throws(() => parseBackup(json({ ...backup, games: [{ ...game, rating: 11 }] })));
  assert.throws(() => parseBackup(json({ ...backup, game_lists: [{ game_id: 2, list_id: 1 }] })));
});

test("status registrados", () => {
  assert.equal(parseBackup(json(backup)).statuses.length, 4);
  const statuses = [{ key: "x", label: "Zerando" }];
  assert.throws(() => parseBackup(json({ ...backup, statuses })));
  assert.equal(parseBackup(json({ ...backup, statuses, games: [{ ...game, status: "x" }] })).games[0].status, "x");
});

test("converte a anotação antiga do jogo", () => {
  const notes = parseBackup(json({ ...backup, games: [{ ...game, notes: "oi" }] })).notes;
  assert.deepEqual(notes.map((n) => [n.game_id, n.body]), [[1, "oi"]]);
});
