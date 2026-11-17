import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { historyStart, type AdminOrder, type OrderStatus } from "./domain/orders";
import type { DeliveryType } from "./domain/pricing";
import { createClient } from "./supabase/server";

/**
 * Barrera real de autorización del panel: valida la sesión contra Supabase Auth
 * y exige `app_metadata.role === 'admin'` (nunca `user_metadata`).
 * Llamar en cada página `/admin/*` y al inicio de cada acción de admin.
 */
export const verifyAdmin = cache(async () => {
  await connection(); // Supabase Auth lee la hora al validar el token: solo en petición
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.app_metadata?.role !== "admin") {
    redirect("/admin/login");
  }
  return { id: data.user.id, email: data.user.email ?? "" };
});

type OrderRow = {
  id: number;
  customer_name: string;
  customer_phone: string;
  delivery_type: DeliveryType;
  address: string | null;
  delivery_at: string;
  delivery_slot: string;
  note: string | null;
  subtotal: number;
  shipping_fee: number;
  total: number;
  status: OrderStatus;
  created_at: string;
  order_items: {
    id: number;
    product_name: string;
    qty: number;
    unit_price: number;
    messages: unknown;
  }[];
};

const ORDERS_LIMIT = 200;

/** Pedidos de los últimos 7 días con sus ítems. Corre con la sesión del admin: RLS sigue vigente. */
export async function getOrders(): Promise<AdminOrder[]> {
  await verifyAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, customer_name, customer_phone, delivery_type, address, delivery_at, delivery_slot, note, subtotal, shipping_fee, total, status, created_at, order_items(id, product_name, qty, unit_price, messages)",
    )
    .gte("created_at", historyStart(new Date()))
    .order("created_at", { ascending: false })
    .order("id", { referencedTable: "order_items", ascending: true })
    .limit(ORDERS_LIMIT)
    .overrideTypes<OrderRow[], { merge: false }>();
  if (error) throw new Error("No se pudieron leer los pedidos");

  return data.map((o) => ({
    id: o.id,
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    deliveryType: o.delivery_type,
    address: o.address,
    deliveryAt: o.delivery_at,
    deliverySlot: o.delivery_slot,
    note: o.note,
    subtotal: o.subtotal,
    shippingFee: o.shipping_fee,
    total: o.total,
    status: o.status,
    createdAt: o.created_at,
    items: o.order_items.map((i) => ({
      id: i.id,
      name: i.product_name,
      qty: i.qty,
      unitPrice: i.unit_price,
      messages: Array.isArray(i.messages) ? i.messages.filter((m): m is string => typeof m === "string") : [],
    })),
  }));
}
