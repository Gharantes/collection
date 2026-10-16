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
export const fetchPrices = async (appIds: number[]) => {
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
  }
  return prices;
};
