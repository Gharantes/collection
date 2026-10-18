import { test } from "node:test";
import assert from "node:assert/strict";
import { NO_EXTRA, fromSaved, toSaved } from "./filters.ts";

test("filtro salvo volta igual", () => {
  const extra = { ...NO_EXTRA, onlyLinked: true, minRating: 7, lists: new Map([[2, "exclude" as const]]) };
  assert.deepEqual(fromSaved(toSaved(extra, "hades")), { extra, text: "hades" });
});

test("filtro salvo antigo usa o padrão no que falta", () => {
  assert.deepEqual(fromSaved("{}"), { extra: NO_EXTRA, text: "" });
  const old = fromSaved(JSON.stringify({ showEarly: false, showPre: true }));
  assert.deepEqual([...old.extra.stages], [["early_access", "exclude"]]);
  assert.equal("showEarly" in old.extra, false);
});
