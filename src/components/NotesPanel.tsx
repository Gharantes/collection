import { useEffect, useRef, useState } from "react";
import { ask, open as openFile } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { addNote, deleteNote, listNotes, setNoteBody, setNoteTitle, type Note } from "../db";
import { NotesEditor } from "./NotesEditor";
import type { Run } from "./common";

const IMAGE_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  svg: "image/svg+xml",
};

// Lê o arquivo como data URL, para guardar a imagem no banco.
const toDataUrl = (bytes: Uint8Array<ArrayBuffer>, type: string) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(new Blob([bytes], { type }));
  });

// Anotações do jogo em cards; clicar abre o dialog de edição.
export function NotesPanel({ gameId, run }: { gameId: number; run: Run }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const menu = useRef<HTMLDetailsElement>(null);

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

  // Fecha o menu "+" ao clicar fora dele.
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (menu.current && !menu.current.contains(e.target as Node)) menu.current.open = false;
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const create = (make: () => Promise<{ lastInsertId?: number } | null>) => {
    menu.current!.open = false;
    act(async () => {
      const id = (await make())?.lastInsertId;
      if (id != null) setOpenId(id);
    });
  };

  const createImage = async () => {
    const path = await openFile({
      multiple: false,
      directory: false,
      title: "Escolha uma imagem",
      filters: [{ name: "Imagem", extensions: Object.keys(IMAGE_TYPES) }],
    });
    if (!path) return null;
    const file = path.split(/[\\/]/).pop()!;
    const type = IMAGE_TYPES[file.split(".").pop()!.toLowerCase()];
    if (!type) throw new Error("Formato de imagem não suportado.");
    const name = file.replace(/\.[^.]+$/, "");
    return addNote(gameId, name, await toDataUrl(await readFile(path), type));
  };

  const open = notes.find((n) => n.id === openId);

  return (
    <div className="detail-notes">
      <h3>Anotações</h3>
      <div className="note-grid">
        {notes.map((n) => (
          <button key={n.id} className={n.image ? "note-card image" : "note-card"} onClick={() => setOpenId(n.id)}>
            {n.image && <img src={n.image} alt="" />}
            <strong>{n.title}</strong>
            {!n.image && <span className="muted">{n.body}</span>}
          </button>
        ))}
        <details className="menu note-add" ref={menu}>
          <summary aria-label="Nova anotação">+</summary>
          <div className="menu-items">
            <button onClick={() => create(() => addNote(gameId))}>Anotação</button>
            <button onClick={() => create(createImage)}>Imagem</button>
          </div>
        </details>
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
        {note.image ? (
          <img className="note-image" src={note.image} alt={title} />
        ) : (
          <NotesEditor noteId={note.id} initial={note.body} onSave={(body) => act(() => setNoteBody(note.id, body))} />
        )}
      </div>
    </dialog>
  );
}
