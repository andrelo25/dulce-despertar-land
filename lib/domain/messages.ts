import { STORE } from "../config";
import { formatMoney } from "./money";
import { toWhatsappId } from "./phone";
import type { DeliveryType } from "./pricing";

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

function deliveryText(o: OrderSummary): string {
  if (o.deliveryType === "domicilio") {
    return `Envío a domicilio (${oneLine(o.address ?? "")}), ${formatMoney(o.shippingFee)} de envío incluido`;
  }
  return `Retiro en el local (${STORE.address})`;
}

function whenText(o: OrderSummary): string {
  return `${formatDateLabel(o.deliveryDate)}, ${formatSlotLabel(o.deliverySlot)}`;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Correo al administrador por pedido nuevo. El asunto va en una sola línea.
 * `text` lleva el enlace `wa.me` visible; `html` convierte el número del cliente en ese enlace,
 * para responderle desde el WhatsApp del administrador.
 */
export function buildAdminEmail(o: OrderSummary & { note?: string | null }): {
  subject: string;
  text: string;
  html: string;
} {
  const waId = toWhatsappId(o.customerPhone);
  const waUrl = waId ? `https://wa.me/${waId}` : null;
  const lines = [
    `Nuevo pedido #${o.id}`,
    "",
    // Con enlace válido el número ya va en él; sin enlace se muestra tal cual para no perder el dato.
    `Cliente: ${oneLine(o.customerName)}${waUrl ? "" : ` (WhatsApp ${o.customerPhone})`}`,
    ...(waUrl ? [`Responder por WhatsApp: ${waUrl}`] : []),
    `Entrega: ${deliveryText(o)}`,
    `Fecha y horario: ${whenText(o)}`,
    "",
    "Ítems:",
  ];
  for (const i of o.items) {
    lines.push(`- ${i.qty} × ${oneLine(i.name)} — ${formatMoney(i.unitPrice * i.qty)}`);
    i.messages.forEach((m, idx) => {
      if (m.trim() !== "") lines.push(`    Mensaje ${idx + 1}: ${oneLine(m)}`);
    });
  }
  lines.push("", `Subtotal: ${formatMoney(o.subtotal)}`);
  if (o.shippingFee > 0) lines.push(`Envío: ${formatMoney(o.shippingFee)}`);
  lines.push(`Total: ${formatMoney(o.total)}`);
  if (o.note?.trim()) lines.push("", `Nota: ${oneLine(o.note)}`);
  const text = lines.join("\n");
  // Se escapa todo y recién después se inserta el enlace: la URL es solo dígitos validados.
  let body = escapeHtml(text);
  if (waUrl) {
    body = body.replace(`Responder por WhatsApp: ${waUrl}`, `Responder por WhatsApp: <a href="${waUrl}">${waUrl}</a>`);
  }
  return {
    subject: `Nuevo pedido #${o.id} — ${oneLine(o.customerName)} — ${formatMoney(o.total)}`,
    text,
    html: `<div style="white-space:pre-wrap;font-family:sans-serif;font-size:14px">${body}</div>`,
  };
}
