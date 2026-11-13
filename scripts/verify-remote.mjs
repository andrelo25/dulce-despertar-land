// Verificación de T5 contra el proyecto Supabase REAL (no modifica datos permanentes: el pedido de prueba se borra al final).
// Uso: node --env-file=.env.local scripts/verify-remote.mjs
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const pub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const sec = process.env.SUPABASE_SECRET_KEY;
let pass = 0, fail = 0;
const ok = (c, m, extra = "") => {
  if (c) pass++;
  else fail++;
  console.log(`  ${c ? "✓" : "✗"} ${m}${c ? "" : "  -> " + extra}`);
};

const call = async (key, path, { method = "GET", body, token } = {}) => {
  const res = await fetch(`${url}${path}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${token ?? key}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json };
};

console.log("anon (publishable key)");
let r = await call(pub, "/rest/v1/products?select=name,status&order=sort_order");
ok(r.status === 200 && r.json.length === 11, "lee los 11 productos activos", JSON.stringify(r.json).slice(0, 120));
r = await call(pub, "/rest/v1/orders?select=*");
ok(r.status === 401 || r.status === 403, `NO lee orders (HTTP ${r.status})`, JSON.stringify(r.json).slice(0, 120));
r = await call(pub, "/rest/v1/order_items?select=*");
ok(r.status === 401 || r.status === 403, `NO lee order_items (HTTP ${r.status})`);
r = await call(pub, "/rest/v1/orders", { method: "POST", body: { customer_name: "x" } });
ok(r.status === 401 || r.status === 403, `NO inserta en orders (HTTP ${r.status})`);
r = await call(pub, "/rest/v1/products?name=eq.Pan%20casero", { method: "PATCH", body: { price: 1 } });
ok(r.status === 401 || r.status === 403, `NO modifica productos (HTTP ${r.status})`);
r = await call(pub, "/rest/v1/rpc/create_order", { method: "POST", body: { p_name: "a", p_phone: "3513445566", p_delivery_type: "retiro", p_address: null, p_delivery_at: new Date(Date.now() + 40 * 3600e3).toISOString(), p_slot: "08:00-09:00", p_note: null, p_shipping_fee: 3000, p_items: [] } });
ok(r.status === 401 || r.status === 403 || r.status === 404, `NO ejecuta create_order (HTTP ${r.status})`);

console.log("secret key (service_role)");
const prods = (await call(sec, "/rest/v1/products?select=id,name,price,section,status")).json;
const by = Object.fromEntries(prods.map((p) => [p.name, p]));
const at = new Date(Date.now() + 40 * 3600e3).toISOString();
const rpc = async (items, phone = "3513445566", type = "domicilio") => (await call(sec, "/rest/v1/rpc/create_order", { method: "POST", body: { p_name: "Prueba T5", p_phone: phone, p_delivery_type: type, p_address: type === "domicilio" ? "Calle de prueba 123" : null, p_delivery_at: at, p_slot: "08:00-09:00", p_note: null, p_shipping_fee: 3000, p_items: items } })).json;

let o = await rpc([{ productId: by["Caja Feliz Cumple"].id, qty: 2, messages: ["Feliz cumple", ""] }, { productId: by["Alfajores artesanales"].id, qty: 3 }]);
ok(o.ok === true && o.subtotal === 86500 && o.shipping_fee === 3000 && o.total === 89500, `crea pedido con total correcto (${o.total})`, JSON.stringify(o));
const orderId = o.id;
let o2 = await rpc([{ productId: by["Alfajores artesanales"].id, qty: 1 }], "3854332211", "retiro");
ok(o2.ok === true && o2.shipping_fee === 0 && o2.total === 7500, "retiro sin envío");
const bad = await rpc([{ productId: by["Alfajores artesanales"].id, qty: 1, messages: ["hola"] }], "3512000001");
ok(bad.ok === false && bad.error === "invalid", "mensaje en un dulce se rechaza");
const over = await rpc([{ productId: by["Caja Feliz Cumple"].id, qty: 21 }], "3512000002");
ok(over.ok === false && over.error === "invalid", "21 unidades se rechazan");

await call(sec, "/rest/v1/products?name=eq.Pan%20casero", { method: "PATCH", body: { status: "hidden" } });
const hid = await rpc([{ productId: by["Pan casero"].id, qty: 1 }], "3512000003");
ok(hid.ok === false && hid.error === "unavailable" && hid.names?.[0] === "Pan casero", "producto oculto: devuelve su nombre");
r = await call(pub, "/rest/v1/products?select=name&name=eq.Pan%20casero");
ok(r.status === 200 && r.json.length === 0, "anon no ve el producto oculto (C3)");
r = await call(sec, "/rest/v1/products?name=eq.Pan%20casero", { method: "PATCH", body: { status: "active" } });
ok(r.status === 200, "producto restaurado a 'active'");

console.log("storage");
r = await call(sec, "/storage/v1/bucket/product-images");
ok(r.status === 200 && r.json.public === true && r.json.file_size_limit === 2097152, "bucket product-images público, 2 MB", JSON.stringify(r.json).slice(0, 150));

console.log("limpieza de pedidos de prueba");
for (const id of [orderId, o2.id].filter(Boolean)) {
  const d = await call(sec, `/rest/v1/orders?id=eq.${id}`, { method: "DELETE" });
  ok(d.status === 200 || d.status === 204, `pedido de prueba #${id} eliminado`, String(d.status));
}
const left = (await call(sec, "/rest/v1/orders?select=id")).json;
ok(Array.isArray(left) && left.length === 0, "no quedan pedidos en la base");

console.log(`\n${pass} correctas, ${fail} fallidas`);
process.exit(fail ? 1 : 0);
