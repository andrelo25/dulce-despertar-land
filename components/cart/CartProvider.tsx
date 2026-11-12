"use client";

import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from "react";
import { MAX_PER_PRODUCT, MAX_TOTAL } from "@/lib/config";
import {
  addBlockReason,
  cartCount,
  cartReducer,
  dropInactive,
  EMPTY_CART,
  parseStoredCart,
  type CartState,
} from "@/lib/domain/cart";

const STORAGE_KEY = "buen-dia:cart:v1";

type CartContextValue = {
  cart: CartState;
  count: number;
  qtyOf: (id: string) => number;
  /** Suma una unidad; avisa si se llegó a un tope. */
  add: (id: string, name: string) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}

/** `activeIds`: productos que hoy se pueden pedir; el resto se descarta del carrito guardado. */
export function CartProvider({ activeIds, children }: { activeIds: string[]; children: React.ReactNode }) {
  const [cart, dispatch] = useReducer(cartReducer, EMPTY_CART);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hydrated = useRef(false);

  const notify = useCallback((message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // Se lee localStorage recién tras montar, para que el HTML del servidor y el primer render coincidan.
  useEffect(() => {
    let stored = EMPTY_CART;
    try {
      stored = parseStoredCart(localStorage.getItem(STORAGE_KEY));
    } catch {
      // localStorage bloqueado (modo privado): se sigue con carrito vacío.
    }
    const kept = dropInactive(stored, activeIds);
    const removed = Object.keys(stored).length - Object.keys(kept).length;
    dispatch({ type: "hydrate", cart: kept });
    if (removed === 0) return;
    const message =
      removed === 1
        ? "Quitamos del carrito un producto que ya no está disponible."
        : `Quitamos del carrito ${removed} productos que ya no están disponibles.`;
    const timer = setTimeout(() => notify(message), 0);
    return () => clearTimeout(timer);
  }, [activeIds, notify]);

  useEffect(() => {
    // El primer render (carrito vacío inicial) no debe pisar lo guardado; la hidratación trae un objeto nuevo.
    if (!hydrated.current && cart === EMPTY_CART) return;
    hydrated.current = true;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Sin persistencia: el carrito sigue funcionando en memoria.
    }
  }, [cart]);

  const add = useCallback(
    (id: string, name: string) => {
      const blocked = addBlockReason(cart, id);
      if (blocked === "product") {
        notify(`Máximo ${MAX_PER_PRODUCT} unidades de ${name}.`);
        return;
      }
      if (blocked === "total") {
        notify(`Máximo ${MAX_TOTAL} productos por pedido.`);
        return;
      }
      dispatch({ type: "inc", id });
      if (!cart[id]) notify(`${name} agregado al carrito`);
    },
    [cart, notify],
  );

  const value: CartContextValue = {
    cart,
    count: cartCount(cart),
    qtyOf: (id) => cart[id]?.qty ?? 0,
    add,
    remove: (id) => dispatch({ type: "dec", id }),
    clear: () => dispatch({ type: "clear" }),
  };

  return (
    <CartContext value={value}>
      {children}
      <div className={toast ? "toast show" : "toast"} role="status" aria-live="polite">
        {toast}
      </div>
    </CartContext>
  );
}
