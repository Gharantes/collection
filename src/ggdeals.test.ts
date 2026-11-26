import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGg } from "./ggdeals.ts";

test("lê os preços da gg.deals em centavos", () => {
  const entry = {
    url: "https://gg.deals/game/ai-limit/",
    prices: { currentRetail: "79.29", currentKeyshops: "76.78", historicalRetail: "67.40", historicalKeyshops: null },
  };
  assert.deepEqual(parseGg(entry), {
    url: "https://gg.deals/game/ai-limit/",
    retail: 7929,
    keyshop: 7678,
    retailLow: 6740,
    keyshopLow: null,
  });
  assert.equal(parseGg(null), null);
});
