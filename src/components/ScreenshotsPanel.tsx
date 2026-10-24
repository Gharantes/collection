import { useEffect, useRef, useState } from "react";
import { fetchImage, fetchScreenshots, type SteamScreenshot } from "../steam";

type Shot = SteamScreenshot & { thumb: string | null };

// Screenshots da loja da Steam, buscadas só ao clicar e guardadas só na memória (blob URLs),
// liberadas ao esconder ou sair da página.
export function ScreenshotsPanel({ appId }: { appId: number }) {
  // null = fechado; "loading" = buscando a lista; string = erro.
  const [shots, setShots] = useState<Shot[] | "loading" | string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const urls = useRef<string[]>([]);

  const release = () => {
    urls.current.forEach(URL.revokeObjectURL);
    urls.current = [];
  };

  useEffect(() => {
    setShots(null);
    setOpen(null);
    return release;
  }, [appId]);

  const show = async () => {
    setShots("loading");
    let list: SteamScreenshot[];
    try {
      list = await fetchScreenshots(appId);
    } catch {
      setShots("Não foi possível buscar as screenshots.");
      return;
    }
    if (list.length === 0) return setShots("Nenhuma screenshot.");
    setShots(list.map((s) => ({ ...s, thumb: null })));
    list.forEach((s, i) =>
      fetchImage(s.path_thumbnail)
        .then((url) => {
          urls.current.push(url);
          setShots((prev) =>
            Array.isArray(prev) ? prev.map((p, j) => (j === i && p.id === s.id ? { ...p, thumb: url } : p)) : prev,
          );
        })
        .catch(() => {}),
    );
  };

  const hide = () => {
    setShots(null);
    setOpen(null);
    release();
  };

  return (
    <div className="detail-history">
      <div className="news-head">
        <h3>Screenshots</h3>
        {shots === null ? (
          <button className="ghost" onClick={show}>
            Ver screenshots
          </button>
        ) : (
          <button className="ghost" onClick={hide}>
            Esconder
          </button>
        )}
      </div>
      {shots === "loading" ? (
        <p className="muted">Buscando screenshots…</p>
      ) : typeof shots === "string" ? (
        <p className="muted">{shots}</p>
      ) : (
        shots && (
          <div className="screenshots">
            {shots.map((s, i) => (
              <button key={s.id} className="screenshot" onClick={() => setOpen(i)} aria-label={`Screenshot ${i + 1}`}>
                {s.thumb && <img src={s.thumb} alt="" />}
              </button>
            ))}
          </div>
        )
      )}
      {Array.isArray(shots) && open != null && (
        <ScreenshotViewer shots={shots} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}

type ViewerProps = { shots: Shot[]; index: number; onIndex: (i: number) => void; onClose: () => void };

// Imagem em tamanho cheio; setas trocam de screenshot. A imagem grande é liberada ao trocar ou fechar.
function ScreenshotViewer({ shots, index, onIndex, onClose }: ViewerProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [full, setFull] = useState<string | null>(null);
  const shot = shots[index];
  const go = (step: number) => onIndex((index + step + shots.length) % shots.length);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  useEffect(() => {
    let url: string | null = null;
    let stale = false;
    setFull(null);
    fetchImage(shot.path_full)
      .then((u) => {
        url = u;
        if (stale) URL.revokeObjectURL(u);
        else setFull(u);
      })
      .catch(() => {});
    return () => {
      stale = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [shot.path_full]);

  return (
    <dialog
      ref={ref}
      className="screenshot-dialog"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
      }}
    >
      {full ? <img src={full} alt="" /> : shot.thumb ? <img src={shot.thumb} alt="" /> : <p className="muted">Carregando…</p>}
      {shots.length > 1 && (
        <>
          <button className="screenshot-nav prev" onClick={() => go(-1)} aria-label="Anterior">
            ‹
          </button>
          <button className="screenshot-nav next" onClick={() => go(1)} aria-label="Próxima">
            ›
          </button>
        </>
      )}
      <span className="screenshot-count">
        {index + 1} / {shots.length}
      </span>
    </dialog>
  );
}
