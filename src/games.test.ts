import { test } from "node:test";
import assert from "node:assert/strict";
import type { Game } from "./db";
import { discount, eventLabels, money, sortGames } from "./games.ts";

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
  assert.deepEqual(eventLabels(["backlog", "playing", "backlog", "playing", "finished"].map((s) => ev(s as never))), [
    "Entrou no backlog",
    "Começou",
    "Voltou ao backlog",
    "Retomou",
    "Terminou",
  ]);
});
