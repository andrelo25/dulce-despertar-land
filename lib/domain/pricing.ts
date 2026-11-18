import { SHIPPING_FEE } from "../config";

export type DeliveryType = "domicilio" | "retiro";

export type PricedItem = { unitPrice: number; qty: number };

export type Totals = { subtotal: number; shippingFee: number; total: number };

/** total = suma(precio × cantidad) + $3.000 si es a domicilio. */
export function computeTotals(items: readonly PricedItem[], deliveryType: DeliveryType): Totals {
  const subtotal = items.reduce((acc, i) => acc + i.unitPrice * i.qty, 0);
  const shippingFee = deliveryType === "domicilio" ? SHIPPING_FEE : 0;
  return { subtotal, shippingFee, total: subtotal + shippingFee };
}

export function countUnits(items: readonly { qty: number }[]): number {
  return items.reduce((acc, i) => acc + i.qty, 0);
}
