import { MAX_PER_PRODUCT, MAX_TOTAL, MESSAGE_MAX } from "../config";

/** Carrito: por producto, cantidad y un mensaje opcional por unidad (se usan desde T9). */
export type CartItem = { qty: number; messages: string[] };
export type CartState = Record<string, CartItem>;

export type CartAction =
  | { type: "inc"; id: string }
  | { type: "dec"; id: string }
  | { type: "remove"; id: string }
  | { type: "setMessage"; id: string; index: number; message: string }
  | { type: "clearMessages"; id: string }
  | { type: "clear" }
  /** Reemplaza el carrito con el leído de localStorage (ya conciliado). */
  | { type: "hydrate"; cart: CartState };

export const EMPTY_CART: CartState = {};

export function cartCount(cart: CartState): number {
  return Object.values(cart).reduce((acc, i) => acc + i.qty, 0);
}

/** Motivo por el que no se puede sumar una unidad más (null si se puede). */
export function addBlockReason(cart: CartState, id: string): "product" | "total" | null {
  if ((cart[id]?.qty ?? 0) >= MAX_PER_PRODUCT) return "product";
  if (cartCount(cart) >= MAX_TOTAL) return "total";
  return null;
}

export function cartReducer(cart: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "inc": {
      if (addBlockReason(cart, action.id)) return cart;
      const item = cart[action.id] ?? { qty: 0, messages: [] };
      return { ...cart, [action.id]: { ...item, qty: item.qty + 1 } };
    }
    case "dec": {
      const item = cart[action.id];
      if (!item) return cart;
      const { [action.id]: _removed, ...rest } = cart;
      void _removed;
      if (item.qty <= 1) return rest;
      const qty = item.qty - 1;
      return { ...rest, [action.id]: { qty, messages: item.messages.slice(0, qty) } };
    }
    case "remove": {
      if (!cart[action.id]) return cart;
      const { [action.id]: _removed, ...rest } = cart;
      void _removed;
      return rest;
    }
    case "setMessage": {
      const item = cart[action.id];
      if (!item || action.index < 0 || action.index >= item.qty) return cart;
      const messages = [...item.messages];
      while (messages.length < item.qty) messages.push("");
      messages[action.index] = action.message.slice(0, MESSAGE_MAX);
      return { ...cart, [action.id]: { ...item, messages } };
    }
    case "clearMessages": {
      const item = cart[action.id];
      if (!item) return cart;
      return { ...cart, [action.id]: { ...item, messages: [] } };
    }
    case "clear":
      return EMPTY_CART;
    case "hydrate":
      return action.cart;
  }
}

/** Deja solo los productos que siguen activos en el catálogo. */
export function dropInactive(cart: CartState, activeIds: readonly string[]): CartState {
  const active = new Set(activeIds);
  return Object.fromEntries(Object.entries(cart).filter(([id]) => active.has(id)));
}

/** Lee el carrito guardado sin confiar en él: descarta lo inválido y aplica los topes. */
export function parseStoredCart(raw: string | null): CartState {
  if (!raw) return EMPTY_CART;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return EMPTY_CART;
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) return EMPTY_CART;

  const out: CartState = {};
  let total = 0;
  for (const [id, value] of Object.entries(data)) {
    if (typeof value !== "object" || value === null) continue;
    const { qty, messages } = value as { qty?: unknown; messages?: unknown };
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1) continue;
    const capped = Math.min(qty, MAX_PER_PRODUCT, MAX_TOTAL - total);
    if (capped < 1) break;
    const msgs = Array.isArray(messages) ? messages.filter((m): m is string => typeof m === "string") : [];
    out[id] = { qty: capped, messages: msgs.slice(0, capped) };
    total += capped;
  }
  return out;
}
