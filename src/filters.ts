import type { ReleaseStage, Status } from "./db";
import type { Mode } from "./games";

// Filtros da seção "Mais filtros".
export type Extra = {
  lists: Map<number, Mode>;
  statuses: Map<Status, Mode>;
  showEarly: boolean;
  showPre: boolean;
  onlyLinked: boolean;
  minRating: number | null;
  maxRating: number | null;
};

export const NO_EXTRA: Extra = {
  lists: new Map(),
  statuses: new Map(),
  showEarly: true,
  showPre: true,
  onlyLinked: false,
  minRating: null,
  maxRating: null,
};

// Com nota mínima ou máxima, jogos sem nota ficam de fora.
export const inRating = (rating: number | null, x: Extra) =>
  (x.minRating == null && x.maxRating == null) ||
  (rating != null && rating >= (x.minRating ?? 0) && rating <= (x.maxRating ?? 10));

// Nas páginas Early Access e Pre-release, os checkboxes ficam fixos: só a da página aparece.
export const withStage = (x: Extra, stage: ReleaseStage | null): Extra =>
  stage ? { ...x, showEarly: stage === "early_access", showPre: stage === "pre_release" } : x;

// Quantos filtros avançados estão ativos (os checkboxes fixos não contam).
export const extraCount = (x: Extra, stage: ReleaseStage | null) =>
  x.lists.size +
  x.statuses.size +
  Number(x.minRating != null) +
  Number(x.maxRating != null) +
  Number(x.onlyLinked) +
  (stage ? 0 : Number(!x.showEarly) + Number(!x.showPre));

// Filtro salvo: o texto da busca e os "Mais filtros", em JSON (os Maps viram listas de pares).
export const toSaved = (extra: Extra, text: string) =>
  JSON.stringify({ ...extra, text, lists: [...extra.lists], statuses: [...extra.statuses] });

// Campos que faltam (filtros salvos antes de existirem) ficam no padrão.
export const fromSaved = (json: string): { extra: Extra; text: string } => {
  const { text = "", lists = [], statuses = [], ...rest } = JSON.parse(json);
  return { text, extra: { ...NO_EXTRA, ...rest, lists: new Map(lists), statuses: new Map(statuses) } };
};
