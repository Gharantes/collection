import { fetch } from "@tauri-apps/plugin-http";

// Preços de um jogo na gg.deals, em centavos (BRL). Pela busca por appid da Steam, são da versão Steam.
export type GgPrices = {
  url: string;
  retail: number | null;
  keyshop: number | null;
  retailLow: number | null;
  keyshopLow: number | null;
};

type Entry = {
  url: string;
  prices: {
    currentRetail: string | null;
    currentKeyshops: string | null;
    historicalRetail: string | null;
    historicalKeyshops: string | null;
  };
} | null;

export const GG_KEY = "collection.ggDealsKey";

// "79.29" para 7929; vazio vira null.
export const toCentsGg = (v: string | null | undefined) => (v == null || v === "" ? null : Math.round(Number(v) * 100));

export const parseGg = (e: Entry): GgPrices | null =>
  e
    ? {
        url: e.url,
        retail: toCentsGg(e.prices.currentRetail),
        keyshop: toCentsGg(e.prices.currentKeyshops),
        retailLow: toCentsGg(e.prices.historicalRetail),
        keyshopLow: toCentsGg(e.prices.historicalKeyshops),
      }
    : null;

// Preços por appid, em lotes de 100; null = a gg.deals não conhece o jogo. Lotes que falharam lançam erro.
export const fetchGgDeals = async (key: string, appIds: number[], onProgress?: (done: number) => void) => {
  const out: Record<number, GgPrices | null> = {};
  for (let i = 0; i < appIds.length; i += 100) {
    const ids = appIds.slice(i, i + 100).join(",");
    const res = await fetch(
      `https://api.gg.deals/v1/prices/by-steam-app-id/?ids=${ids}&region=br&key=${encodeURIComponent(key)}`,
    );
    // Com erro, data traz { message }; senão, um Entry por appid.
    const body = (await res.json().catch(() => null)) as { success: boolean; data: Record<string, unknown> } | null;
    if (!res.ok || !body?.success) throw new Error(`gg.deals: ${body?.data?.message ?? `erro ${res.status}`}`);
    for (const [id, entry] of Object.entries(body.data)) out[Number(id)] = parseGg(entry as Entry);
    onProgress?.(Math.min(i + 100, appIds.length));
  }
  return out;
};
