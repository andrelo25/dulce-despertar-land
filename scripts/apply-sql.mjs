// Ejecuta un archivo SQL en el proyecto Supabase con la Management API.
// Uso:  node --env-file=.env.local scripts/apply-sql.mjs supabase/migrations/0001_init.sql
// Lee SUPABASE_ACCESS_TOKEN y NEXT_PUBLIC_SUPABASE_URL del entorno; no guarda ni muestra secretos.
import fs from "node:fs";

const file = process.argv[2];
const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname.split(".")[0];

if (!file || !token || !ref) {
  console.error("Uso: node --env-file=.env.local scripts/apply-sql.mjs <archivo.sql> (requiere SUPABASE_ACCESS_TOKEN)");
  process.exit(1);
}

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  signal: AbortSignal.timeout(60000),
  body: JSON.stringify({ query: fs.readFileSync(file, "utf8") }),
});
const text = await res.text();

if (!res.ok) {
  console.error(`Falló ${file} (HTTP ${res.status}): ${text.slice(0, 600)}`);
  process.exit(1);
}
console.log(`OK ${file} (HTTP ${res.status})`);
