import { fetch } from "@tauri-apps/plugin-http";

export type SteamApp = { id: number; name: string; tiny_image: string };

// Busca jogos na loja da Steam pelo nome.
export const searchSteam = async (term: string): Promise<SteamApp[]> => {
  const res = await fetch(
    `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&l=portuguese&cc=BR`,
  );
  if (!res.ok) throw new Error(`Steam retornou ${res.status}`);
  return ((await res.json()) as { items?: SteamApp[] }).items ?? [];
};
