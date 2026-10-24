import type { ReleaseStage, Status } from "./db";
import type { Mode } from "./games";

// Estágio de release de um jogo; sem estágio, é lançado.
export type Stage = ReleaseStage | "released";
export const stageOf = (g: { release_stage: ReleaseStage | null }): Stage => g.release_stage ?? "released";

// Itens do filtro "Release": os estágios e "Possui demo".
export type ReleaseKey = Stage | "demo";
export const hasRelease = (g: { release_stage: ReleaseStage | null; demo_steam_id: number | null }, key: ReleaseKey) =>
  key === "demo" ? g.demo_steam_id != null : stageOf(g) === key;

// Filtros da seção "Mais filtros".
export type Extra = {
  lists: Map<number, Mode>;
  statuses: Map<Status, Mode>;
  stages: Map<ReleaseKey, Mode>;
  onlyLinked: boolean;
  // true: só jogos com "Buscar notícias" ligado; false: só os com ele desligado.
  news: boolean | null;
  minRating: number | null;
  maxRating: number | null;
};

export const NO_EXTRA: Extra = {
  lists: new Map(),
  statuses: new Map(),
  stages: new Map(),
  onlyLinked: false,
  news: null,
  minRating: null,
  maxRating: null,
};

// Com nota mínima ou máxima, jogos sem nota ficam de fora.
export const inRating = (rating: number | null, x: Extra) =>
  (x.minRating == null && x.maxRating == null) ||
  (rating != null && rating >= (x.minRating ?? 0) && rating <= (x.maxRating ?? 10));

export const inNews = (g: { news: 0 | 1 }, x: Extra) => x.news == null || !!g.news === x.news;

// Quantos filtros avançados estão ativos.
export const extraCount = (x: Extra) =>
  x.lists.size +
  x.statuses.size +
  x.stages.size +
  Number(x.minRating != null) +
  Number(x.maxRating != null) +
  Number(x.onlyLinked) +
  Number(x.news != null);

// Colunas da tabela que dá para esconder (imagem e nome ficam sempre).
export const COLUMNS = {
  price: "Preço",
  release: "Release Date",
  status: "Status",
  rating: "Nota",
  lists: "Listas",
  remove: "Remover",
} as const;
export type Column = keyof typeof COLUMNS;
export const DEFAULT_COLUMNS: Column[] = ["price", "status", "rating", "lists", "remove"];
export const isColumn = (c: unknown): c is Column => typeof c === "string" && c in COLUMNS;

// Filtro salvo: o texto da busca, os "Mais filtros" e as colunas da tabela, em JSON (os Maps viram listas de pares).
export const toSaved = (extra: Extra, text: string, columns?: Column[]) =>
  JSON.stringify({ ...extra, text, lists: [...extra.lists], statuses: [...extra.statuses], stages: [...extra.stages], columns });

// Campos que faltam (filtros salvos antes de existirem) ficam no padrão; sem colunas, carregar não mexe nelas.
// Os antigos "Mostrar Early Access" e "Mostrar Pre-release" desmarcados viram excluir o estágio.
export const fromSaved = (json: string): { extra: Extra; text: string; columns?: Column[] } => {
  const { text = "", lists = [], statuses = [], stages = [], columns, showEarly, showPre, ...rest } = JSON.parse(json);
  const stageModes = new Map<ReleaseKey, Mode>(stages);
  if (showEarly === false) stageModes.set("early_access", "exclude");
  if (showPre === false) stageModes.set("pre_release", "exclude");
  const extra = { ...NO_EXTRA, ...rest, lists: new Map(lists), statuses: new Map(statuses), stages: stageModes };
  return Array.isArray(columns) ? { text, extra, columns: columns.filter(isColumn) } : { text, extra };
};
