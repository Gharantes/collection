import { test } from "node:test";
import assert from "node:assert/strict";
import { NO_EXTRA, fromSaved, hasRelease, toSaved } from "./filters.ts";

test("filtro salvo volta igual", () => {
  const extra = { ...NO_EXTRA, onlyLinked: true, minRating: 7, lists: new Map([[2, "exclude" as const]]) };
  assert.deepEqual(fromSaved(toSaved(extra, "hades")), { extra, text: "hades" });
});

test("filtro salvo com colunas", () => {
  const saved = fromSaved(toSaved(NO_EXTRA, "", ["price", "release", "velha" as never]));
  assert.deepEqual(saved.columns, ["price", "release"]);
});

test("filtro salvo antigo usa o padrão no que falta", () => {
  assert.deepEqual(fromSaved("{}"), { extra: NO_EXTRA, text: "" });
  const old = fromSaved(JSON.stringify({ showEarly: false, showPre: true }));
  assert.deepEqual([...old.extra.stages], [["early_access", "exclude"]]);
  assert.equal("showEarly" in old.extra, false);
});

test("release com demo", () => {
  const g = { release_stage: "early_access" as const, demo_steam_id: 10 };
  assert.equal(hasRelease(g, "demo"), true);
  assert.equal(hasRelease(g, "early_access"), true);
  assert.equal(hasRelease({ ...g, demo_steam_id: null }, "demo"), false);
});
