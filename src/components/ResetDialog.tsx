import { useEffect, useRef, useState } from "react";

const CONFIRM_TEXT = "RESET_ALL";

type Props = {
  onConfirm: () => void;
  onClose: () => void;
};

// Confirmação de "Resetar biblioteca": só libera o botão depois de digitar RESET_ALL.
export function ResetDialog({ onConfirm, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="reset-dialog"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
    >
      <form
        className="reset-dialog-body"
        onSubmit={(e) => {
          e.preventDefault();
          if (text !== CONFIRM_TEXT) return;
          onConfirm();
          ref.current?.close();
        }}
      >
        <h2>Resetar biblioteca</h2>
        <p>
          Isso apaga todos os jogos, listas, anotações, histórico de status e tempo de jogo. Não dá para desfazer.
          Para continuar, digite <code>{CONFIRM_TEXT}</code>.
        </p>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={CONFIRM_TEXT}
          aria-label="Texto de confirmação"
          autoFocus
          spellCheck={false}
        />
        <div className="reset-dialog-actions">
          <button type="button" className="ghost" onClick={() => ref.current?.close()}>
            Cancelar
          </button>
          <button type="submit" className="confirm-reset" disabled={text !== CONFIRM_TEXT}>
            Apagar tudo
          </button>
        </div>
      </form>
    </dialog>
  );
}
