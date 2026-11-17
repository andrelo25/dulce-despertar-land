import { CONFIRM_WINDOW_MINUTES } from "../config";
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

export type Countdown = { label: string; late: boolean; urgent: boolean };

/** "Quedan X min para confirmar" / "Demorado X min", respecto de la ventana de 30 min (C20, C25). */
export function confirmCountdown(createdAt: number, now: number): Countdown {
  const elapsed = Math.max(0, Math.floor((now - createdAt) / 60000));
  const left = CONFIRM_WINDOW_MINUTES - elapsed;
  if (left > 0) return { label: `Quedan ${left} min para confirmar`, late: false, urgent: left <= 5 };
  return { label: `Demorado ${-left} min`, late: true, urgent: true };
}

export type OrderStats = { pending: number; confirmed: number; todayTotal: number };

/** "Total del día": pedidos creados hoy (hora argentina) que no fueron cancelados. */
export function orderStats(orders: readonly AdminOrder[], now: Date): OrderStats {
  const today = artDateString(now);
  return {
    pending: orders.filter((o) => o.status === "pendiente").length,
    confirmed: orders.filter((o) => o.status === "confirmado").length,
    todayTotal: orders
      .filter((o) => o.status !== "cancelado" && artDateString(new Date(o.createdAt)) === today)
      .reduce((acc, o) => acc + o.total, 0),
  };
}

/** Mensajes personalizados no vacíos, con el número de unidad al que pertenecen. */
export function personalizedMessages(messages: readonly string[]): { unit: number; text: string }[] {
  return messages.flatMap((text, i) => (text.trim() === "" ? [] : [{ unit: i + 1, text }]));
}
