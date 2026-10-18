import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { addLink, deleteLink, listLinks, type GameLink } from "../db";
import type { Run } from "./common";

type Site = "youtube" | "twitter" | null;

// Reconhece YouTube e Twitter/X pelo domínio; o resto fica com o ícone padrão.
const siteOf = (url: string): Site => {
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^(www|m|mobile)\./, "");
  } catch {
    return null;
  }
  if (host === "youtube.com" || host === "youtu.be" || host === "music.youtube.com") return "youtube";
  if (host === "twitter.com" || host === "x.com") return "twitter";
  return null;
};

// Sem protocolo, assume https. Null se não for um link http(s) válido.
const normalize = (text: string) => {
  const raw = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
};

function LinkIcon({ site }: { site: Site }) {
  if (site === "youtube")
    return (
      <svg viewBox="0 0 24 24" className="link-icon youtube" aria-label="YouTube">
        <path
          fill="currentColor"
          d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8Z"
        />
        <path fill="#fff" d="m9.6 15.6 6.2-3.6-6.2-3.6Z" />
      </svg>
    );
  if (site === "twitter")
    return (
      <svg viewBox="0 0 24 24" className="link-icon twitter" aria-label="Twitter">
        <path
          fill="currentColor"
          d="M18.9 1.2h3.7l-8 9.2L24 22.8h-7.4l-5.8-7.6-6.6 7.6H.5L9 13 0 1.2h7.6l5.2 6.9Zm-1.3 19.4h2L6.5 3.3H4.3Z"
        />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className="link-icon" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"
      />
    </svg>
  );
}

// Links do jogo: colar a URL, salvar e clicar para abrir no navegador.
export function LinksPanel({ gameId, run }: { gameId: number; run: Run }) {
  const [links, setLinks] = useState<GameLink[]>([]);
  const [text, setText] = useState("");

  const refresh = async () => setLinks(await listLinks(gameId));

  useEffect(() => {
    setText("");
    refresh().catch(() => setLinks([]));
  }, [gameId]);

  const act = (action: () => Promise<unknown>) =>
    run(async () => {
      try {
        await action();
      } finally {
        await refresh();
      }
    })();

  const save = () => {
    const value = text.trim();
    if (!value) return;
    const url = normalize(value);
    act(async () => {
      if (!url) throw new Error("Link inválido.");
      await addLink(gameId, url);
      setText("");
    });
  };

  return (
    <div className="detail-history">
      <h3>Links</h3>
      {links.length > 0 && (
        <ul className="links">
          {links.map((l) => (
            <li key={l.id}>
              <button className="link" onClick={run(() => invoke("open_link", { url: l.url }))} title={l.url}>
                <LinkIcon site={siteOf(l.url)} />
                <span>{l.url.replace(/^https?:\/\/(www\.)?/, "")}</span>
              </button>
              <button className="chip-remove" onClick={() => act(() => deleteLink(l.id))} aria-label="Apagar link">
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="link-add"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          placeholder="Colar URL"
          aria-label="Novo link"
        />
        <button type="submit" disabled={!text.trim()}>
          Salvar
        </button>
      </form>
    </div>
  );
}
