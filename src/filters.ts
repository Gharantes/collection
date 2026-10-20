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
  minRating: number | null;
  maxRating: number | null;
};

export const NO_EXTRA: Extra = {
  lists: new Map(),
  statuses: new Map(),
  stages: new Map(),
  onlyLinked: false,
  minRating: null,
  maxRating: null,
};

// Com nota mínima ou máxima, jogos sem nota ficam de fora.
export const inRating = (rating: number | null, x: Extra) =>
  (x.minRating == null && x.maxRating == null) ||
  (rating != null && rating >= (x.minRating ?? 0) && rating <= (x.maxRating ?? 10));

// Quantos filtros avançados estão ativos.
export const extraCount = (x: Extra) =>
  x.lists.size +
  x.statuses.size +
  x.stages.size +
  Number(x.minRating != null) +
  Number(x.maxRating != null) +
  Number(x.onlyLinked);

// Filtro salvo: o texto da busca e os "Mais filtros", em JSON (os Maps viram listas de pares).
export const toSaved = (extra: Extra, text: string) =>
  JSON.stringify({ ...extra, text, lists: [...extra.lists], statuses: [...extra.statuses], stages: [...extra.stages] });

// Campos que faltam (filtros salvos antes de existirem) ficam no padrão. Os antigos "Mostrar Early Access" e
// "Mostrar Pre-release" desmarcados viram excluir o estágio.
export const fromSaved = (json: string): { extra: Extra; text: string } => {
  const { text = "", lists = [], statuses = [], stages = [], showEarly, showPre, ...rest } = JSON.parse(json);
  const stageModes = new Map<ReleaseKey, Mode>(stages);
  if (showEarly === false) stageModes.set("early_access", "exclude");
  if (showPre === false) stageModes.set("pre_release", "exclude");
  return { text, extra: { ...NO_EXTRA, ...rest, lists: new Map(lists), statuses: new Map(statuses), stages: stageModes } };
};
