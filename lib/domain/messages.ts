import { STORE } from "../config";
import { formatMoney } from "./money";
import type { DeliveryType } from "./pricing";

/**
 * Parámetros de plantillas de WhatsApp. Meta no admite saltos de línea ni tabulaciones en los
 * parámetros, por eso todo va en una sola línea (ítems separados con "·"). Ver plan §4.8.
 */

export type OrderSummaryItem = {
  name: string;
  qty: number;
  unitPrice: number;
  messages: readonly string[];
};

export type OrderSummary = {
  id: number;
  customerName: string;
  customerPhone: string;
  deliveryType: DeliveryType;
  address: string | null;
  deliveryDate: string; // AAAA-MM-DD
  deliverySlot: string; // HH:MM-HH:MM
  items: readonly OrderSummaryItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
};

/** Colapsa saltos de línea, tabulaciones y espacios repetidos. */
export function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function formatDateLabel(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

export function formatSlotLabel(slot: string): string {
  return slot.replace("-", " a ");
}

export function summarizeItems(items: readonly OrderSummaryItem[]): string {
  return items
    .map((i) => {
      const personalized = i.messages.some((m) => m.trim() !== "");
      const detail = `${formatMoney(i.unitPrice * i.qty)}${personalized ? ", con mensaje personalizado" : ""}`;
      return oneLine(`${i.qty} × ${i.name} (${detail})`);
    })
    .join(" · ");
}

function deliveryText(o: OrderSummary): string {
  if (o.deliveryType === "domicilio") {
    return `Envío a domicilio (${oneLine(o.address ?? "")}), ${formatMoney(o.shippingFee)} de envío incluido`;
  }
  return `Retiro en el local (${STORE.address})`;
}

function whenText(o: OrderSummary): string {
  return `${formatDateLabel(o.deliveryDate)}, ${formatSlotLabel(o.deliverySlot)}`;
}

/** Plantilla `pedido_confirmado` (cliente). Orden fijo: debe coincidir con la plantilla aprobada en Meta. */
export function confirmedParams(o: OrderSummary): string[] {
  return [
    oneLine(o.customerName),
    String(o.id),
    summarizeItems(o.items),
    formatMoney(o.total),
    deliveryText(o),
    whenText(o),
    STORE.paymentAlias,
  ];
}

/** Plantilla `pedido_cancelado` (cliente): disculpas por no llegar con el pedido. */
export function cancelledParams(o: OrderSummary): string[] {
  return [oneLine(o.customerName), String(o.id)];
}

/** Plantilla `pedido_nuevo_admin` (administrador). */
export function adminNewOrderParams(o: OrderSummary): string[] {
  const how = o.deliveryType === "domicilio" ? "Envío a domicilio" : "Retiro en local";
  return [
    String(o.id),
    oneLine(o.customerName),
    o.customerPhone,
    formatMoney(o.total),
    `${how}, ${whenText(o)}`,
  ];
}
