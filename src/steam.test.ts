import { test } from "node:test";
import assert from "node:assert/strict";
import { releaseNotice } from "./games.ts";
import { plainText, steamDate } from "./steam.ts";

test("avisa quando a Steam diz outra coisa", () => {
  const ea = { release_stage: "early_access" as const, release_date: null };
  const pre = { release_stage: "pre_release" as const, release_date: "Q1 2027" };
  assert.equal(releaseNotice(ea, { stage: null, date: null })?.action, "Marcar como lançado");
  assert.equal(releaseNotice(pre, { stage: "early_access", date: null })?.action, "Marcar como Early Access");
  assert.equal(releaseNotice(pre, { stage: "pre_release", date: "17/10/2026" })?.action, "Atualizar data");
  assert.equal(releaseNotice(pre, { stage: "pre_release", date: "Q1 2027" }), null);
  assert.equal(releaseNotice(pre, { stage: "pre_release", date: null }), null);
  assert.equal(releaseNotice(ea, { stage: "early_access", date: null }), null);
});

test("converte a data da Steam para o formato do app", () => {
  assert.equal(steamDate("17 Oct, 2026"), "17/10/2026");
  assert.equal(steamDate("Oct 7, 2026"), "07/10/2026");
  assert.equal(steamDate("October 2026"), "10/2026");
  assert.equal(steamDate("Q1 2027"), "Q1 2027");
  assert.equal(steamDate("2027"), "2027");
  assert.equal(steamDate("Coming soon"), null);
  assert.equal(steamDate("To be announced"), null);
});

test("tira BBCode, HTML e links do trecho da notícia", () => {
  assert.equal(
    plainText("[b]Oi[/b] <i>tudo</i> [img]{STEAM_CLAN_IMAGE}/a.png[/img]bem https://x.com/a\n\n fim"),
    "Oi tudo bem fim",
  );
});
