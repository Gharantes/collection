import type { Game, StatusEvent } from "./db";

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
export function eventLabels(events: StatusEvent[]): string[] {
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
    return played ? "Voltou ao backlog" : "Entrou no backlog";
  });
}

// AAAA-MM-DD -> DD/MM/AAAA.
export const formatDate = (at: string) => at.split("-").reverse().join("/");

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
