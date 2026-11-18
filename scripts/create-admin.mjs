// Crea un administrador (Auth + app_metadata.role = 'admin'). Se puede repetir para más admins.
// Uso:  ADMIN_EMAIL=... ADMIN_PASSWORD=... node --env-file=.env.local scripts/create-admin.mjs
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
const res = await fetch(`${url}/auth/v1/admin/users`, {
  method: "POST",
  headers,
  signal: AbortSignal.timeout(15000),
  body: JSON.stringify({ email, password, email_confirm: true, app_metadata: { role: "admin" } }),
});
const body = await res.json().catch(() => ({}));

if (!res.ok) {
  console.error(`No se pudo crear el administrador (HTTP ${res.status}): ${body.msg ?? body.message ?? "error"}`);
  process.exit(1);
}
console.log(`Administrador creado: ${body.email} (id ${body.id}, rol ${body.app_metadata?.role})`);
