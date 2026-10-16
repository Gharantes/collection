import { test } from "node:test";
import assert from "node:assert/strict";
import { EditorState } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { previewSpans } from "./livePreview.ts";

// Texto que continua visível, dado o documento e a posição do cursor.
function visible(doc: string, cursor: number): string {
  const state = EditorState.create({ doc, selection: { anchor: cursor }, extensions: markdown({ base: markdownLanguage }) });
  let out = "";
  let pos = 0;
  for (const s of previewSpans(state).filter((s) => s.kind === "hide")) {
    out += doc.slice(pos, s.from);
    pos = s.to;
  }
  return out + doc.slice(pos);
}

test("live preview esconde a sintaxe longe do cursor", () => {
  const doc = "# Title\n\nSome **bold**, *it*, ~~gone~~, `code` and [a link](http://x.io).\n\n> quoted\n\nend";
  assert.equal(visible(doc, doc.length), "Title\n\nSome bold, it, gone, code and a link.\n\nquoted\n\nend");
  assert.ok(visible(doc, 2).startsWith("# Title"), "cursor no título mostra #");
  assert.ok(visible(doc, doc.indexOf("bold") + 1).includes("**bold**"), "cursor no negrito mostra **");
});
