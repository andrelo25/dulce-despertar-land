"use server";

import { revalidatePath } from "next/cache";
import { verifyAdmin } from "../dal";
import { ORDER_TRANSITIONS, type OrderAction } from "../domain/orders";
import { createClient } from "../supabase/server";

export type OrderActionResult = { ok: true } | { ok: false; error: string };

/**
 * Cambio de estado atómico: el `update ... where id = ? and status = <origen>` solo
 * afecta una fila si el pedido sigue en el estado esperado. No envía ningún mensaje.
 */
async function transition(action: OrderAction, id: number): Promise<OrderActionResult> {
  await verifyAdmin();
  if (!Number.isSafeInteger(id) || id <= 0) return { ok: false, error: "Pedido inválido" };

  const { from, to } = ORDER_TRANSITIONS[action];
  const supabase = await createClient();
  const { data, error } = await supabase.from("orders").update({ status: to }).eq("id", id).eq("status", from).select("id");

  if (error) {
    console.error("order transition failed", { action, id, code: error.code });
    return { ok: false, error: "No se pudo actualizar el pedido" };
  }
  if (data.length === 0) {
    return { ok: false, error: "El pedido ya cambió de estado. Se actualizó la lista." };
  }
  revalidatePath("/admin");
  return { ok: true };
}

export async function confirmOrder(id: number) {
  return transition("confirm", id);
}

export async function cancelOrder(id: number) {
  return transition("cancel", id);
}

export async function markDelivered(id: number) {
  return transition("deliver", id);
}
