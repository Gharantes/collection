import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { setReleaseDate, setReleaseStage, type Game } from "../db";
import { releaseNotice } from "../games";
import { readPref, savePref } from "../prefs";
import { fetchNews, fetchRelease, type SteamNews, type SteamRelease } from "../steam";
import type { Run } from "./common";

const FEED_PREF = "news-feed";

// Notícias da Steam, buscadas ao abrir a página e nunca salvas. Sem internet ou se falhar, não aparece.
export function NewsPanel({ game, run }: { game: Game; run: Run }) {
  const appId = game.steam_id;
  const [official, setOfficial] = useState(() => readPref(FEED_PREF, ["official", "all"], "official") === "official");
  // null = buscando; false = sem internet ou falhou.
  const [news, setNews] = useState<SteamNews[] | null | false>(null);
  const [release, setRelease] = useState<SteamRelease | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (appId == null) return;
    let stale = false;
    setNews(null);
    fetchNews(appId, official)
      .then((n) => !stale && setNews(navigator.onLine ? n : false))
      .catch(() => !stale && setNews(false));
    return () => {
      stale = true;
    };
  }, [appId, official]);

  useEffect(() => {
    if (appId == null) return;
    let stale = false;
    setRelease(null);
    setDismissed(false);
    fetchRelease(appId)
      .then((r) => !stale && setRelease(r))
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [appId]);

  if (appId == null || news === false) return null;

  const notice = release && !dismissed ? releaseNotice(game, release) : null;
  const apply = (r: SteamRelease) =>
    run(async () => {
      await setReleaseStage(game.id, r.stage);
      if (r.stage === "pre_release" && r.date) await setReleaseDate(game.id, r.date);
    })();

  const toggle = (on: boolean) => {
    setOfficial(on);
    savePref(FEED_PREF, on ? "official" : "all");
  };

  return (
    <div className="detail-history">
      <div className="news-head">
        <h3>Notícias</h3>
        <label className="check">
          <input type="checkbox" checked={official} onChange={(e) => toggle(e.currentTarget.checked)} />
          Só anúncios oficiais
        </label>
      </div>
      {notice && release && (
        <div className="news-notice">
          <span>{notice.text}</span>
          <button onClick={() => apply(release)}>{notice.action}</button>
          <button className="chip-remove" onClick={() => setDismissed(true)} aria-label="Fechar aviso">
            ×
          </button>
        </div>
      )}
      {news === null ? (
        <p className="muted">Buscando notícias…</p>
      ) : news.length === 0 ? (
        <p className="muted">Nenhuma notícia.</p>
      ) : (
        <ul className="news">
          {news.map((n) => (
            <li key={n.gid}>
              <button className="news-title" onClick={run(() => invoke("open_link", { url: n.url }))} title={n.url}>
                {n.title}
              </button>
              <span className="muted">
                {new Date(n.date * 1000).toLocaleDateString("pt-BR")}
                {!official && ` · ${n.feedlabel}`}
              </span>
              {n.contents && <p>{n.contents}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
