import { fetch } from "@tauri-apps/plugin-http";

export type SteamApp = {
  id: number;
  name: string;
  tiny_image: string;
  // Ausente em jogos gratuitos. Valores em centavos.
  price?: SteamPrice;
};

// Busca jogos na loja da Steam pelo nome.
export const searchSteam = async (term: string): Promise<SteamApp[]> => {
  const res = await fetch(
    `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&l=portuguese&cc=BR`,
  );
  if (!res.ok) throw new Error(`Steam retornou ${res.status}`);
  return ((await res.json()) as { items?: SteamApp[] }).items ?? [];
};

export type SteamPrice = { currency: string; initial: number; final: number };

type Details = {
  success: boolean;
  // A Steam manda [] em vez de objeto para jogos gratuitos.
  data?: { price_overview?: { currency: string; initial: number; final: number } } | [];
};

// Preço atual por appid, em lotes de 100; null = sem preço (gratuito). Appids que falharam ficam de fora.
// onProgress recebe quantos já foram buscados.
export const fetchPrices = async (appIds: number[], onProgress?: (done: number) => void) => {
  const prices: Record<number, SteamPrice | null> = {};
  for (let i = 0; i < appIds.length; i += 100) {
    const ids = appIds.slice(i, i + 100).join(",");
    const res = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${ids}&filters=price_overview&cc=BR`,
    );
    if (!res.ok) throw new Error(`Steam retornou ${res.status}`);
    const body = (await res.json()) as Record<string, Details>;
    for (const [id, entry] of Object.entries(body)) {
      if (!entry.success) continue;
      const p = Array.isArray(entry.data) ? undefined : entry.data?.price_overview;
      prices[Number(id)] = p ? { currency: p.currency, initial: p.initial, final: p.final } : null;
    }
    onProgress?.(Math.min(i + 100, appIds.length));
  }
  return prices;
};

// Capa pequena da loja, usada quando o jogo não veio da busca.
export const capsule = (appId: number) =>
  `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/capsule_231x87.jpg`;

// Demo aponta para o jogo completo (fullgame); jogo aponta para a sua demo, se tiver.
export type SteamItem = { id: number; name: string; fullgame: number | null; demo: number | null };

type StoreItem = {
  id: number;
  success: number;
  name: string;
  // 1 = demo.
  type?: number;
  related_items?: { parent_appid?: number; demo_appid?: number[] };
};

// Nome, demo e jogo completo por appid, em lotes de 100 (essa API aceita vários appids de uma vez).
// Appids que falharam ficam de fora. onProgress recebe quantos já foram buscados.
export const fetchItems = async (appIds: number[], onProgress?: (done: number) => void) => {
  const items: Record<number, SteamItem> = {};
  for (let i = 0; i < appIds.length; i += 100) {
    const input = {
      ids: appIds.slice(i, i + 100).map((appid) => ({ appid })),
      context: { language: "english", country_code: "BR" },
      data_request: { include_related_items: true },
    };
    const res = await fetch(
      `https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json=${encodeURIComponent(JSON.stringify(input))}`,
    );
    if (!res.ok) throw new Error(`Steam retornou ${res.status}`);
    const body = (await res.json()) as { response?: { store_items?: StoreItem[] } };
    for (const it of body.response?.store_items ?? []) {
      if (it.success !== 1) continue;
      const related = it.related_items ?? {};
      items[it.id] = {
        id: it.id,
        name: it.name,
        fullgame: it.type === 1 ? (related.parent_appid ?? null) : null,
        demo: related.demo_appid?.[0] ?? null,
      };
    }
    onProgress?.(Math.min(i + 100, appIds.length));
  }
  return items;
};

// Um app só; null se falhou (sem internet, erro da Steam).
export const fetchItem = (appId: number) =>
  fetchItems([appId])
    .then((items) => items[appId] ?? null)
    .catch(() => null);

// Sem internet não adianta tentar; com internet lenta, desiste depois de 8 s.
const online = () => typeof navigator === "undefined" || navigator.onLine;
const TIMEOUT = 8000;

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// Data da Steam em inglês para o formato do app: "17 Oct, 2026" e "Oct 17, 2026" viram "17/10/2026",
// "Oct 2026" vira "10/2026"; "Q1 2027" e "2027" ficam iguais; "Coming soon"/"To be announced" viram null.
export const steamDate = (text: string): string | null => {
  const t = text.trim();
  if (!t || /^(coming soon|to be announced|tba)$/i.test(t)) return null;
  const month = (name: string) => MONTHS.indexOf(name.slice(0, 3).toLowerCase()) + 1;
  const pad = (n: number | string) => String(n).padStart(2, "0");
  let m = t.match(/^(\d{1,2}) ([A-Za-z]+),? (\d{4})$/);
  if (m && month(m[2])) return `${pad(m[1])}/${pad(month(m[2]))}/${m[3]}`;
  m = t.match(/^([A-Za-z]+) (\d{1,2}),? (\d{4})$/);
  if (m && month(m[1])) return `${pad(m[2])}/${pad(month(m[1]))}/${m[3]}`;
  m = t.match(/^([A-Za-z]+),? (\d{4})$/);
  if (m && month(m[1])) return `${pad(month(m[1]))}/${m[2]}`;
  return t;
};

// Estado de lançamento na Steam: "em breve" é Pre-release (com a data prevista), gênero 70 é Early Access.
export type SteamRelease = { stage: "early_access" | "pre_release" | null; date: string | null };

export const fetchRelease = async (appId: number): Promise<SteamRelease | null> => {
  if (!online()) return null;
  // A Steam só aceita vários appids de uma vez com filters=price_overview; aqui é um por vez.
  const res = await fetch(
    `https://store.steampowered.com/api/appdetails?appids=${appId}&filters=release_date,genres&l=english`,
    { signal: AbortSignal.timeout(TIMEOUT) },
  );
  if (!res.ok) throw new Error(`Steam retornou ${res.status}`);
  const entry = ((await res.json()) as Record<string, ReleaseDetails>)[appId];
  if (!entry?.success || !entry.data || Array.isArray(entry.data)) return null;
  const { release_date, genres } = entry.data;
  if (release_date?.coming_soon) return { stage: "pre_release", date: steamDate(release_date.date) };
  if (genres?.some((g) => g.id === "70")) return { stage: "early_access", date: null };
  return { stage: null, date: null };
};

type ReleaseDetails = {
  success: boolean;
  data?: { release_date?: { coming_soon: boolean; date: string }; genres?: { id: string }[] } | [];
};

export type SteamNews = { gid: string; title: string; url: string; date: number; feedlabel: string; contents: string };

// Últimas notícias do jogo; oficial = só os anúncios dos desenvolvedores na Steam.
export const fetchNews = async (appId: number, official: boolean): Promise<SteamNews[]> => {
  if (!online()) return [];
  const feeds = official ? "&feeds=steam_community_announcements" : "";
  const res = await fetch(
    `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appId}&count=5&maxlength=400${feeds}`,
    { signal: AbortSignal.timeout(TIMEOUT) },
  );
  if (!res.ok) throw new Error(`Steam retornou ${res.status}`);
  const items = ((await res.json()) as { appnews?: { newsitems?: SteamNews[] } }).appnews?.newsitems ?? [];
  return items.map((n) => ({ ...n, contents: plainText(n.contents) }));
};

// Tira BBCode, HTML e links soltos do trecho da notícia.
export const plainText = (text: string) =>
  text
    .replace(/\[img\][\s\S]*?\[\/img\]/gi, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
