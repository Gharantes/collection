import { useEffect, useRef, useState } from "react";
import { ask } from "@tauri-apps/plugin-dialog";
import { addNote, deleteNote, listNotes, setNoteBody, setNoteTitle, type Note } from "../db";
import { NotesEditor } from "./NotesEditor";
import type { Run } from "./common";

// Anotações do jogo em cards; clicar abre o dialog de edição.
export function NotesPanel({ gameId, run }: { gameId: number; run: Run }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);

  const refresh = async () => setNotes(await listNotes(gameId));

  useEffect(() => {
    setOpenId(null);
    refresh().catch(() => setNotes([]));
  }, [gameId]);

  // Roda a ação pelo `run` do App e atualiza os cards mesmo se falhar.
  const act = (action: () => Promise<unknown>) =>
    run(async () => {
      try {
        await action();
      } finally {
        await refresh();
      }
    })();

  const create = () =>
    act(async () => {
      const { lastInsertId } = await addNote(gameId);
      if (lastInsertId != null) setOpenId(lastInsertId);
    });

  const open = notes.find((n) => n.id === openId);

  return (
    <div className="detail-notes">
      <h3>Anotações</h3>
      <div className="note-grid">
        {notes.map((n) => (
          <button key={n.id} className="note-card" onClick={() => setOpenId(n.id)}>
            <strong>{n.title}</strong>
            <span className="muted">{n.body}</span>
          </button>
        ))}
        <button className="note-add" onClick={create} aria-label="Nova anotação">
          +
        </button>
      </div>
      {open && (
        <NoteDialog
          key={open.id}
          note={open}
          act={act}
          onClose={() => setOpenId(null)}
          onDelete={() =>
            act(async () => {
              if (!(await ask(`Apagar a anotação "${open.title}"?`, { title: "Apagar anotação", kind: "warning" })))
                return;
              setOpenId(null);
              await deleteNote(open.id);
            })
          }
        />
      )}
    </div>
  );
}

type DialogProps = {
  note: Note;
  act: (action: () => Promise<unknown>) => void;
  onClose: () => void;
  onDelete: () => void;
};

// Título e corpo salvam sozinhos; o título também ao fechar.
function NoteDialog({ note, act, onClose, onDelete }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(note.title);
  const saved = useRef(note.title);
  const current = useRef(title);
  current.current = title;

  const saveTitle = () => {
    if (current.current === saved.current) return;
    saved.current = current.current;
    act(() => setNoteTitle(note.id, current.current));
  };

  useEffect(() => {
    ref.current?.showModal();
    return saveTitle;
  }, []);

  return (
    <dialog
      ref={ref}
      className="note-dialog"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
    >
      <div className="note-dialog-body">
        <div className="note-dialog-head">
        <input
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          onBlur={saveTitle}
          placeholder="Untitled"
          aria-label="Título da anotação"
        />
        <button className="ghost" onClick={onDelete}>
          Apagar
        </button>
        <button className="ghost" onClick={() => ref.current?.close()} aria-label="Fechar">
          ×
        </button>
      </div>
        <NotesEditor noteId={note.id} initial={note.body} onSave={(body) => act(() => setNoteBody(note.id, body))} />
      </div>
    </dialog>
  );
}
