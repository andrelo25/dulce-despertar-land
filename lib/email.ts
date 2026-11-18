import "server-only";
import { buildAdminEmail, type OrderSummary } from "./domain/messages";
import { createSecretClient } from "./supabase/secret";

const RESEND_URL = "https://api.resend.com/emails";
const TIMEOUT_MS = 8000;

export type NewOrderEmailInput = Omit<OrderSummary, "items"> & { note: string | null };

function logFailure(orderId: number, reason: string) {
  // Nunca se registran la clave del proveedor, los correos ni el contenido del pedido.
  console.error(JSON.stringify({ level: "error", event: "admin_email_failed", orderId, reason }));
}

/** Correos de los usuarios con `app_metadata.role === 'admin'` (nunca `user_metadata`). */
async function getAdminEmails(supabase: ReturnType<typeof createSecretClient>): Promise<string[]> {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error("list_users_failed");
  return data.users
    .filter((u) => u.app_metadata?.role === "admin" && u.email)
    .map((u) => u.email as string);
}

async function getItems(supabase: ReturnType<typeof createSecretClient>, orderId: number) {
  const { data, error } = await supabase
    .from("order_items")
    .select("product_name, qty, unit_price, messages")
    .eq("order_id", orderId)
    .order("id", { ascending: true });
  if (error || !data) throw new Error("items_failed");
  return data.map((i) => ({
    name: i.product_name as string,
    qty: i.qty as number,
    unitPrice: i.unit_price as number,
    messages: Array.isArray(i.messages) ? i.messages.filter((m): m is string => typeof m === "string") : [],
  }));
}

/**
 * Avisa por correo a todos los administradores de un pedido nuevo.
 * Nunca lanza: un fallo se registra y el pedido ya creado no se ve afectado.
 */
export async function notifyAdminsNewOrder(input: NewOrderEmailInput): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) return logFailure(input.id, "not_configured");

    const supabase = createSecretClient();
    const [to, items] = await Promise.all([getAdminEmails(supabase), getItems(supabase, input.id)]);
    if (to.length === 0) return logFailure(input.id, "no_admins");

    const { subject, text, html } = buildAdminEmail({ ...input, items });
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text, html }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) logFailure(input.id, `http_${res.status}`);
  } catch (e) {
    logFailure(input.id, e instanceof Error && e.name === "TimeoutError" ? "timeout" : "error");
  }
}
