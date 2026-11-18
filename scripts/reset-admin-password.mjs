// Cambia la clave de un usuario existente (por email).
// Uso:  ADMIN_EMAIL=... ADMIN_PASSWORD=... node --env-file=.env.local scripts/reset-admin-password.mjs
// La clave NO se guarda en ningún archivo: se lee del entorno solo durante la ejecución.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!url || !secret || !email || !password) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, ADMIN_EMAIL o ADMIN_PASSWORD.");
  process.exit(1);
}

const headers = { apikey: secret, Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };

const list = await fetch(`${url}/auth/v1/admin/users?per_page=1000`, { headers, signal: AbortSignal.timeout(15000) });
const listBody = await list.json().catch(() => ({}));
if (!list.ok) {
  console.error(`No se pudo leer los usuarios (HTTP ${list.status}).`);
  process.exit(1);
}
const user = listBody.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  console.error("No existe un usuario con ese email.");
  process.exit(1);
}

const res = await fetch(`${url}/auth/v1/admin/users/${user.id}`, {
  method: "PUT",
  headers,
  signal: AbortSignal.timeout(15000),
  body: JSON.stringify({ password }),
});
const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(`No se pudo cambiar la clave (HTTP ${res.status}): ${body.msg ?? body.message ?? "error"}`);
  process.exit(1);
}
console.log(`Clave actualizada para ${body.email} (rol ${body.app_metadata?.role ?? "sin rol"})`);
