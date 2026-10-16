import { HighlightStyle, syntaxHighlighting, syntaxTree } from "@codemirror/language";
import type { EditorState } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";

// Marcas de sintaxe a esconder, por nome do nó, com os elementos pai onde ficam escondidas.
const HIDE: Record<string, (parent: string) => boolean> = {
  HeaderMark: (p) => p.startsWith("ATXHeading"),
  EmphasisMark: () => true,
  StrikethroughMark: () => true,
  CodeMark: (p) => p === "InlineCode",
  QuoteMark: () => true,
};

export type Span = { from: number; to: number; kind: "hide" | "quote" };

// Trechos a esconder (e linhas de citação a estilizar) entre from e to, dada a seleção atual.
export function previewSpans(state: EditorState, from = 0, to = state.doc.length): Span[] {
  const touched = (a: number, b: number) => state.selection.ranges.some((r) => r.from <= b && r.to >= a);
  const spans: Span[] = [];
  syntaxTree(state).iterate({
    from,
    to,
    enter(node) {
      if (node.name === "Blockquote") {
        for (let pos = node.from; pos <= node.to; ) {
          const line = state.doc.lineAt(pos);
          spans.push({ from: line.from, to: line.from, kind: "quote" });
          pos = line.to + 1;
        }
      }
      // Links mostram só o texto: esconde "[" e tudo de "]" até o fim.
      if (node.name === "Link") {
        const marks = node.node.getChildren("LinkMark");
        if (marks.length >= 2 && !touched(node.from, node.to)) {
          spans.push({ from: marks[0].from, to: marks[0].to, kind: "hide" });
          spans.push({ from: marks[1].from, to: node.to, kind: "hide" });
        }
        return false;
      }
      const parent = node.node.parent;
      if (!parent || !HIDE[node.name]?.(parent.name) || touched(parent.from, parent.to)) return;
      // Esconde também o espaço depois de "#" e ">".
      const spaced =
        (node.name === "HeaderMark" || node.name === "QuoteMark") &&
        state.sliceDoc(node.to, node.to + 1) === " ";
      spans.push({ from: node.from, to: node.to + (spaced ? 1 : 0), kind: "hide" });
    },
  });
  return spans;
}

const hidden = Decoration.replace({});
const quoteLine = Decoration.line({ class: "cm-lp-quote" });

function decorations(view: EditorView): DecorationSet {
  const { from } = view.visibleRanges[0] ?? { from: 0 };
  const { to } = view.visibleRanges[view.visibleRanges.length - 1] ?? { to: 0 };
  const decos = previewSpans(view.state, from, to).map((s) =>
    (s.kind === "hide" ? hidden : quoteLine).range(s.from, s.to),
  );
  return Decoration.set(decos, true);
}

const plugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = decorations(view);
    }
    update(u: ViewUpdate) {
      if (u.docChanged || u.viewportChanged || u.selectionSet || syntaxTree(u.startState) !== syntaxTree(u.state))
        this.decorations = decorations(u.view);
    }
  },
  { decorations: (v) => v.decorations },
);

const style = HighlightStyle.define([
  { tag: t.heading1, fontSize: "1.6em", fontWeight: "700" },
  { tag: t.heading2, fontSize: "1.35em", fontWeight: "700" },
  { tag: t.heading3, fontSize: "1.2em", fontWeight: "600" },
  { tag: [t.heading4, t.heading5, t.heading6], fontSize: "1.05em", fontWeight: "600" },
  { tag: t.strong, fontWeight: "700" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: t.link, color: "#6aa8ff" },
  { tag: t.url, color: "#8a92a5" },
  { tag: t.monospace, fontFamily: "monospace", backgroundColor: "#ffffff14", borderRadius: "3px" },
  { tag: [t.processingInstruction, t.meta, t.quote], color: "#8a92a5" },
]);

const theme = EditorView.theme(
  {
    "&": { color: "#e7e9ee", backgroundColor: "transparent" },
    ".cm-scroller": { fontFamily: "inherit", lineHeight: "1.6" },
    "&.cm-focused": { outline: "none" },
    ".cm-content": { padding: "12px 14px", caretColor: "#e7e9ee" },
    ".cm-cursor": { borderLeftColor: "#e7e9ee" },
    ".cm-placeholder": { color: "#8a92a5" },
    ".cm-lp-quote": { borderLeft: "3px solid #6aa8ff", paddingLeft: "12px" },
  },
  { dark: true },
);

// Live Preview estilo Obsidian: o markdown renderiza na linha, a sintaxe só aparece onde está o cursor.
export const livePreview = () => [plugin, syntaxHighlighting(style), theme];
