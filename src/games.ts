import type { Game } from "./db";

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
