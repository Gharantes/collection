import { test } from "node:test";
import assert from "node:assert/strict";
import type { Game } from "./db";
import { discount, eventLabels, formatDuration, formatRelease, hitsTarget, matchModes, money, sortGames, toCents, type Mode } from "./games.ts";

const game = (id: number, name: string, rating: number | null, price: number | null) =>
  ({ id, name, rating, price }) as Game;

test("ordena com vazios no fim", () => {
  const games = [game(1, "b", null, 500), game(2, "a", 7, null), game(3, "c", 9, 100)];
  const names = (sort: Parameters<typeof sortGames>[1]) => sortGames(games, sort).map((g) => g.name).join("");
  assert.equal(names("name"), "abc");
  assert.equal(names("rating"), "cab");
  assert.equal(names("price"), "cba");
  assert.equal(names("recent"), "cab");
});

test("desconto e preço", () => {
  assert.equal(discount(7399, 3699), 50);
  assert.equal(discount(7399, 7399), 0);
  assert.equal(discount(null, 100), 0);
  assert.equal(money(7399, "BRL"), "R$\u00a073,99");
  assert.equal(money(null, "BRL"), "—");
});

test("rótulos do histórico de status", () => {
  const ev = (status: "backlog" | "playing" | "finished") => ({ id: 0, game_id: 1, status, at: "2026-01-01" });
  assert.deepEqual(eventLabels(["backlog", "playing", "backlog", "playing", "abandoned", "playing", "finished"].map((s) => ev(s as never))), [
    "Entrou no backlog",
    "Começou",
    "Voltou ao backlog",
    "Retomou",
    "Abandonou",
    "Retomou",
    "Terminou",
  ]);
});

test("preço-alvo e desconto mínimo", () => {
  const g = (price: number, price_initial: number, target_price: number | null, target_discount: number | null) =>
    ({ price, price_initial, target_price, target_discount }) as Game;
  assert.equal(hitsTarget(g(3000, 6000, 3500, null)), true);
  assert.equal(hitsTarget(g(4000, 6000, 3500, null)), false);
  assert.equal(hitsTarget(g(3000, 6000, null, 50)), true);
  assert.equal(hitsTarget(g(6000, 6000, null, 50)), false);
  assert.equal(toCents("R$ 49,90"), 4990);
  assert.equal(toCents("abc"), null);
  assert.equal(toCents(""), null);
});

test("duração", () => {
  assert.equal(formatDuration(45000), "12 h 30 min");
  assert.equal(formatDuration(7200), "2 h");
  assert.equal(formatDuration(600), "10 min");
  assert.equal(formatDuration(30), "< 1 min");
});

test("release date em texto livre, convertendo as antigas AAAA-MM-DD", () => {
  assert.equal(formatRelease("2026-10-17"), "17/10/2026");
  assert.equal(formatRelease("Q1 2027"), "Q1 2027");
  assert.equal(formatRelease("2027"), "2027");
  assert.equal(formatRelease(null), "");
});

test("filtro incluir, exigir e excluir", () => {
  const tags = new Set(["a", "b"]);
  const has = (k: string) => tags.has(k);
  const ok = (modes: [string, Mode][]) => matchModes(has, new Map(modes));
  assert.equal(ok([]), true);
  assert.equal(ok([["a", "include"], ["c", "include"]]), true);
  assert.equal(ok([["c", "include"]]), false);
  assert.equal(ok([["a", "require"], ["b", "require"]]), true);
  assert.equal(ok([["c", "require"]]), false);
  assert.equal(ok([["b", "exclude"]]), false);
  assert.equal(ok([["c", "exclude"], ["a", "include"]]), true);
});
