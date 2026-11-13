"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
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
import type { Product } from "@/lib/domain/catalog";

const STORAGE_KEY = "buen-dia:cart:v1";

type CartContextValue = {
  cart: CartState;
  count: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  products: readonly Product[];
  getProduct: (id: string) => Product | undefined;
  qtyOf: (id: string) => number;
  /** Suma una unidad; avisa si se llegó a un tope. */
  add: (id: string, name: string) => void;
  remove: (id: string) => void;
  removeItem: (id: string) => void;
  setMessage: (id: string, index: number, message: string) => void;
  clearMessages: (id: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}

type CartProviderProps = {
  products?: readonly Product[];
  activeIds?: readonly string[];
  children: React.ReactNode;
};

/** `activeIds` o `products`: productos que hoy se pueden pedir; el resto se descarta del carrito guardado. */
export function CartProvider({ products = [], activeIds, children }: CartProviderProps) {
  const [cart, dispatch] = useReducer(cartReducer, EMPTY_CART);
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hydrated = useRef(false);

  const notify = useCallback((message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  const getProduct = useCallback(
    (id: string) => products.find((p) => p.id === id),
    [products],
  );

  // Se lee localStorage una sola vez tras montar, para que el HTML del servidor y el primer render coincidan.
  useEffect(() => {
    let stored = EMPTY_CART;
    try {
      stored = parseStoredCart(localStorage.getItem(STORAGE_KEY));
    } catch {
      // localStorage bloqueado (modo privado): se sigue con carrito vacío.
    }
    const currentActiveIds = activeIds ?? products.filter((p) => p.status === "active").map((p) => p.id);
    const kept = dropInactive(stored, currentActiveIds);
    const removed = Object.keys(stored).length - Object.keys(kept).length;
    hydrated.current = true;
    dispatch({ type: "hydrate", cart: kept });
    if (removed === 0) return;
    const message =
      removed === 1
        ? "Quitamos del carrito un producto que ya no está disponible."
        : `Quitamos del carrito ${removed} productos que ya no están disponibles.`;
    const timer = setTimeout(() => notify(message), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // No pisar localStorage antes de haber hidratado
    if (!hydrated.current) return;
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

  const remove = useCallback((id: string) => dispatch({ type: "dec", id }), []);
  const removeItem = useCallback((id: string) => dispatch({ type: "remove", id }), []);
  const setMessage = useCallback(
    (id: string, index: number, message: string) =>
      dispatch({ type: "setMessage", id, index, message }),
    [],
  );
  const clearMessages = useCallback((id: string) => dispatch({ type: "clearMessages", id }), []);
  const clear = useCallback(() => dispatch({ type: "clear" }), []);

  const value: CartContextValue = {
    cart,
    count: cartCount(cart),
    isOpen,
    open,
    close,
    toggle,
    products,
    getProduct,
    qtyOf: (id) => cart[id]?.qty ?? 0,
    add,
    remove,
    removeItem,
    setMessage,
    clearMessages,
    clear,
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
