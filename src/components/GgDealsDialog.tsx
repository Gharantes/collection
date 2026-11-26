import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { GG_KEY } from "../ggdeals";
import { readText, savePref } from "../prefs";
import type { Run } from "./common";

// "gg.deals": chave da API, guardada só neste computador (fora do backup).
export function GgDealsDialog({ run, onClose }: { run: Run; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [key, setKey] = useState(() => readText(GG_KEY));

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const onSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Pelo run, o app recarrega e a página do jogo já usa a chave nova.
    run(async () => savePref(GG_KEY, key.trim()))();
    ref.current?.close();
  };

  return (
    <dialog
      ref={ref}
      className="reset-dialog"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
    >
      <form className="reset-dialog-body" onSubmit={onSave}>
        <h2>gg.deals</h2>
        <p className="status-hint">
          Com a chave, o "Atualizar Dados" também busca na gg.deals o menor preço da versão Steam nas lojas oficiais
          e nas keyshops, nos jogos com "Quero comprar". A chave é gratuita, na sua conta da{" "}
          <button
            type="button"
            className="inline-link"
            onClick={run(() => invoke("open_link", { url: "https://gg.deals/api/" }))}
          >
            gg.deals
          </button>
          . Fica só neste computador (não vai no backup).
        </p>
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Chave da API (vazio desliga)"
          aria-label="Chave da API da gg.deals"
          spellCheck={false}
          autoFocus
        />
        <div className="reset-dialog-actions">
          <button type="button" className="ghost" onClick={() => ref.current?.close()}>
            Cancelar
          </button>
          <button type="submit">Salvar</button>
        </div>
      </form>
    </dialog>
  );
}
