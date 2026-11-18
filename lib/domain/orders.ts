import { CONFIRM_WINDOW_MINUTES, TZ_OFFSET } from "../config";
import { artDateString } from "./slots";
import type { DeliveryType } from "./pricing";

export type OrderStatus = "pendiente" | "confirmado" | "entregado" | "cancelado";

export type AdminOrderItem = {
  id: number;
  name: string;
  qty: number;
  unitPrice: number;
  messages: string[];
};

/** Pedido tal como lo muestra el panel (ya mapeado desde las filas de la base). */
export type AdminOrder = {
  id: number;
  customerName: string;
  customerPhone: string;
  deliveryType: DeliveryType;
  address: string | null;
  deliveryAt: string; // ISO
  deliverySlot: string;
  note: string | null;
  subtotal: number;
  shippingFee: number;
  total: number;
  status: OrderStatus;
  createdAt: string; // ISO
  items: AdminOrderItem[];
};

export type OrderAction = "confirm" | "cancel" | "deliver";

/** Transiciones permitidas (C21, C22, C24): estado de origen requerido → estado nuevo. */
export const ORDER_TRANSITIONS: Record<OrderAction, { from: OrderStatus; to: OrderStatus }> = {
  confirm: { from: "pendiente", to: "confirmado" },
  cancel: { from: "pendiente", to: "cancelado" },
  deliver: { from: "confirmado", to: "entregado" },
};

export type Countdown = { label: string; late: boolean; urgent: boolean };

/** "Quedan X min para confirmar" / "Demorado X min", respecto de la ventana de 30 min (C20, C25). */
export function confirmCountdown(createdAt: number, now: number): Countdown {
  const elapsed = Math.max(0, Math.floor((now - createdAt) / 60000));
  const left = CONFIRM_WINDOW_MINUTES - elapsed;
  if (left > 0) return { label: `Quedan ${left} min para confirmar`, late: false, urgent: left <= 5 };
  return { label: `Demorado ${-left} min`, late: true, urgent: true };
}

export const HISTORY_DAYS = 7;
export const ORDERS_PAGE_SIZE = 10;

/** Inicio (ISO) del historial: 00:00 hora argentina de hace `HISTORY_DAYS - 1` días, o sea hoy y los 6 anteriores. */
export function historyStart(now: Date): string {
  const startOfToday = new Date(`${artDateString(now)}T00:00:00${TZ_OFFSET}`);
  return new Date(startOfToday.getTime() - (HISTORY_DAYS - 1) * 86_400_000).toISOString();
}

export type Page<T> = { items: T[]; page: number; pages: number };

/** Página `page` (base 1) de `items`; si `page` se sale de rango se ajusta al último valor válido. */
export function paginate<T>(items: readonly T[], page: number, size = ORDERS_PAGE_SIZE): Page<T> {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, Math.trunc(page) || 1), pages);
  return { items: items.slice((current - 1) * size, current * size), page: current, pages };
}

export type OrderStats = {
  pending: number;
  confirmed: number;
  delivered: number;
  cancelled: number;
  todayTotal: number;
};

/** "Total del día": pedidos creados hoy (hora argentina) que no fueron cancelados. */
export function orderStats(orders: readonly AdminOrder[], now: Date): OrderStats {
  const today = artDateString(now);
  return {
    pending: orders.filter((o) => o.status === "pendiente").length,
    confirmed: orders.filter((o) => o.status === "confirmado").length,
    delivered: orders.filter((o) => o.status === "entregado").length,
    cancelled: orders.filter((o) => o.status === "cancelado").length,
    todayTotal: orders
      .filter((o) => o.status !== "cancelado" && artDateString(new Date(o.createdAt)) === today)
      .reduce((acc, o) => acc + o.total, 0),
  };
}

/** Mensajes personalizados no vacíos, con el número de unidad al que pertenecen. */
export function personalizedMessages(messages: readonly string[]): { unit: number; text: string }[] {
  return messages.flatMap((text, i) => (text.trim() === "" ? [] : [{ unit: i + 1, text }]));
}
