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

test("o que o Atualizar Dados confere em cada status", () => {
  const checks = (s: { check_releases: number; check_demos: number }) => [s.check_releases, s.check_demos];
  // Backup antigo: tudo ligado, menos no Abandonado.
  const old = parseBackup(json(backup)).statuses;
  assert.deepEqual(checks(old.find((s) => s.key === "playing")!), [1, 1]);
  assert.deepEqual(checks(old.find((s) => s.key === "abandoned")!), [0, 0]);
  const statuses = [{ key: "playing", label: "Jogando", check_releases: 1, check_demos: 0 }];
  assert.deepEqual(checks(parseBackup(json({ ...backup, statuses })).statuses[0]), [1, 0]);
  // Sem status: backup antigo tudo ligado; senão, o que veio.
  assert.deepEqual(checks(parseBackup(json(backup)).no_status), [1, 1]);
  const no_status = { check_releases: 1, check_demos: 0 };
  assert.deepEqual(checks(parseBackup(json({ ...backup, no_status })).no_status), [1, 0]);
});

test("Quero comprar no backup", () => {
  // Backup antigo não tem: fica desmarcado ao restaurar (COALESCE no banco). Backup novo: o que veio.
  assert.equal(parseBackup(json(backup)).games[0].track_price, undefined);
  assert.equal(parseBackup(json({ ...backup, games: [{ ...game, track_price: 1 }] })).games[0].track_price, 1);
  assert.throws(() => parseBackup(json({ ...backup, games: [{ ...game, track_price: 2 }] })));
});

test("filtros salvos", () => {
  assert.deepEqual(parseBackup(json(backup)).filters, []);
  const filters = [{ id: 1, name: "Vinculados", filter: "{}" }];
  assert.equal(parseBackup(json({ ...backup, filters })).filters.length, 1);
  assert.throws(() => parseBackup(json({ ...backup, filters: [...filters, { id: 2, name: "Vinculados", filter: "{}" }] })));
});

test("converte a anotação antiga do jogo", () => {
  const notes = parseBackup(json({ ...backup, games: [{ ...game, notes: "oi" }] })).notes;
  assert.deepEqual(notes.map((n) => [n.game_id, n.body]), [[1, "oi"]]);
});
