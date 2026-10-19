import type { Game, StatusEvent } from "./db";
import type { SteamRelease } from "./steam";

export type Sort = "name" | "rating" | "price" | "recent";

export const SORTS: Record<Sort, string> = {
  name: "Nome",
  rating: "Nota",
  price: "Preço",
  recent: "Adicionados recentemente",
};

// Centavos para texto, ex.: 7399 BRL -> "R$ 73,99".
export const money = (cents: number | null, currency: string | null) =>
  cents == null || !currency
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);

// Faixa de cor da nota.
export const ratingTier = (r: number | null) =>
  r == null ? "" : r >= 8 ? "good" : r >= 5 ? "ok" : "bad";

// Compara números com vazio sempre no fim; dir -1 inverte a ordem.
const nullsLast = (a: number | null, b: number | null, dir = 1) =>
  a == null ? (b == null ? 0 : 1) : b == null ? -1 : (a - b) * dir;

const byName = (a: Game, b: Game) => a.name.localeCompare(b.name, "pt-BR");

const COMPARE: Record<Sort, (a: Game, b: Game) => number> = {
  name: byName,
  rating: (a, b) => nullsLast(a.rating, b.rating, -1) || byName(a, b),
  price: (a, b) => nullsLast(a.price, b.price) || byName(a, b),
  recent: (a, b) => b.id - a.id,
};

export const sortGames = (games: Game[], sort: Sort) => [...games].sort(COMPARE[sort]);

// Desconto em %, ou 0 se não estiver em promoção.
export const discount = (initial: number | null, final: number | null) =>
  initial == null || final == null || final >= initial ? 0 : Math.round((1 - final / initial) * 100);

// Rótulo de cada evento (em ordem cronológica), conforme o que veio antes.
// Status registrados pelo usuário aparecem pelo nome, de `names`.
export function eventLabels(events: StatusEvent[], names: Record<string, string> = {}): string[] {
  let played = false;
  return events.map((e) => {
    if (e.status === "playing") {
      const label = played ? "Retomou" : "Começou";
      played = true;
      return label;
    }
    if (e.status === "finished") {
      played = true;
      return "Terminou";
    }
    if (e.status === "abandoned") {
      played = true;
      return "Abandonou";
    }
    if (e.status === "backlog") return played ? "Voltou ao backlog" : "Entrou no backlog";
    return names[e.status] ?? e.status;
  });
}

// AAAA-MM-DD -> DD/MM/AAAA.
export const formatDate = (at: string) => at.split("-").reverse().join("/");

// Release date é texto livre, como na Steam ("17/10/2026", "Q1 2027", "2027").
// As antigas, salvas como AAAA-MM-DD, aparecem como DD/MM/AAAA.
export const formatRelease = (text: string | null) =>
  !text ? "" : /^\d{4}-\d{2}-\d{2}$/.test(text) ? formatDate(text) : text;

// Aviso quando a Steam diz algo diferente do que está marcado no jogo; null se bate.
export const releaseNotice = (g: Pick<Game, "release_stage" | "release_date">, s: SteamRelease) => {
  if (g.release_stage !== s.stage) {
    if (s.stage === null)
      return {
        text:
          g.release_stage === "early_access"
            ? "Na Steam este jogo não está mais em Early Access."
            : "Na Steam este jogo já foi lançado.",
        action: "Marcar como lançado",
      };
    if (s.stage === "early_access")
      return {
        text:
          g.release_stage === "pre_release"
            ? "Na Steam este jogo entrou em Early Access."
            : "Na Steam este jogo está em Early Access.",
        action: "Marcar como Early Access",
      };
    return {
      text: `Na Steam este jogo ainda não foi lançado${s.date ? ` (previsto: ${s.date})` : ""}.`,
      action: "Marcar como Pre-release",
    };
  }
  if (s.stage === "pre_release" && s.date && formatRelease(g.release_date) !== s.date)
    return { text: `Na Steam a data de lançamento é ${s.date}.`, action: "Atualizar data" };
  return null;
};

// Jogo com preço no alvo: abaixo do preço-alvo ou com desconto mínimo atingido.
export const hitsTarget = (g: Game) => {
  if (g.price == null) return false;
  const off = discount(g.price_initial, g.price);
  return (
    (g.target_price != null && g.price <= g.target_price) ||
    (g.target_discount != null && off > 0 && off >= g.target_discount)
  );
};

// Texto digitado ("49,90", "R$ 49.90") para centavos; vazio ou inválido vira null.
export const toCents = (text: string) => {
  const clean = text.replace(/[^\d,.]/g, "").replace(",", ".");
  return clean && Number.isFinite(Number(clean)) ? Math.round(Number(clean) * 100) : null;
};

// Bytes para texto, ex.: 1536 -> "1,5 KB".
export const formatBytes = (bytes: number) => {
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${units[i]}`;
};

// Segundos para texto, ex.: 45000 -> "12 h 30 min".
export const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return m ? `${m} min` : "< 1 min";
};

// Modo de um item nos filtros avançados (listas e status).
export type Mode = "include" | "require" | "exclude";

// Passa se tem algum dos incluídos (quando houver), todos os exigidos e nenhum excluído.
export const matchModes = <K>(has: (k: K) => boolean, modes: Map<K, Mode>) => {
  let anyInclude = false;
  let included = false;
  for (const [k, mode] of modes) {
    if (mode === "include") {
      anyInclude = true;
      if (has(k)) included = true;
    } else if (mode === "require" ? !has(k) : has(k)) return false;
  }
  return !anyInclude || included;
};

// Mudança de preço encontrada ao atualizar; guarda o nome caso o jogo seja apagado depois.
export type PriceChange = { gameId: number; name: string; kind: "down" | "up" | "target"; text: string };

// Compara os jogos antes e depois de atualizar os preços.
export const priceChanges = (before: Game[], after: Game[]): PriceChange[] => {
  const old = new Map(before.map((g) => [g.id, g]));
  const changes: PriceChange[] = [];
  for (const g of after) {
    const b = old.get(g.id);
    if (!b) continue;
    const add = (kind: PriceChange["kind"], text: string) => changes.push({ gameId: g.id, name: g.name, kind, text });
    const was = discount(b.price_initial, b.price);
    const now = discount(g.price_initial, g.price);
    const price = money(g.price, g.currency);
    if (b.price == null && g.price != null) add("up", `Ganhou preço: ${price}`);
    else if (b.price != null && g.price == null) add("down", "Ficou sem preço");
    else if (b.price == null || g.price == null) continue;
    else if (!was && now) add("down", `Entrou em desconto: -${now}% (${price})`);
    else if (was && !now) add("up", `Saiu de desconto: ${price}`);
    else if (was !== now) add(now > was ? "down" : "up", `Desconto mudou de -${was}% para -${now}% (${price})`);
    else if (b.price !== g.price)
      add(g.price < b.price ? "down" : "up", `Preço mudou de ${money(b.price, b.currency)} para ${price}`);
    if (hitsTarget(g) && !hitsTarget(b)) add("target", "Entrou no preço-alvo");
  }
  return changes;
};
