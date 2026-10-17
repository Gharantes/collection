import { useEffect, useRef } from "react";
import { EditorView, minimalSetup } from "codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { placeholder } from "@codemirror/view";
import { livePreview } from "../livePreview";

type Props = { noteId: number; initial: string; onSave: (text: string) => void };

// Editor markdown com live preview; salva 500 ms depois de parar de digitar e ao fechar.
export function NotesEditor({ noteId, initial, onSave }: Props) {
  const parent = useRef<HTMLDivElement>(null);
  const save = useRef(onSave);
  save.current = onSave;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending: string | null = null;
    const flush = () => {
      clearTimeout(timer);
      if (pending != null) save.current(pending);
      pending = null;
    };

    const view = new EditorView({
      parent: parent.current!,
      doc: initial,
      extensions: [
        minimalSetup,
        markdown({ base: markdownLanguage }),
        livePreview(),
        EditorView.lineWrapping,
        placeholder("Anotações em markdown…"),
        EditorView.updateListener.of((u) => {
          if (!u.docChanged) return;
          pending = u.state.doc.toString();
          clearTimeout(timer);
          timer = setTimeout(flush, 500);
        }),
      ],
    });

    return () => {
      flush();
      view.destroy();
    };
    // Recria só ao trocar de anotação.
  }, [noteId]);

  return <div className="notes" ref={parent} />;
}
