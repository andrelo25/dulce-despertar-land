// Verifica supabase/migrations/0001_init.sql y supabase/seed.sql en un Postgres local (PGlite).
// Simula lo mínimo de Supabase: roles anon/authenticated/service_role, auth.jwt() y storage.
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = process.cwd();
const sql = (f: string) => fs.readFileSync(path.join(root, f), "utf8");

let db: PGlite;

const ADMIN = { role: "authenticated", app_metadata: { role: "admin" } };
// El propio usuario puede editar user_metadata: NO debe darle permisos de admin.
const USER = { role: "authenticated", app_metadata: {}, user_metadata: { role: "admin" } };

async function as<T>(role: string, claims: object | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${role}`);
  await db.query("select set_config('request.jwt.claims', $1, false)", [claims ? JSON.stringify(claims) : ""]);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}
const q = async <T = Record<string, unknown>>(text: string, params?: unknown[]) =>
  (await db.query<T>(text, params)).rows;
const errorOf = async (text: string, params?: unknown[]) => {
  try {
    await db.query(text, params);
    return "";
  } catch (e) {
    return (e as Error).message;
  }
};

const hoursAhead = (h: number) => new Date(Date.now() + h * 3600e3).toISOString();
type Item = { productId: string; qty: number; messages?: unknown[] };
type Opts = { phone?: string; type?: string; addr?: string | null; at?: string };
const createOrder = async (items: Item[], o: Opts = {}) =>
  (
    await q<{ r: Record<string, unknown> }>(
      "select create_order($1,$2,$3::delivery_type,$4,$5::timestamptz,$6,$7,$8,$9::jsonb) r",
      [
        "Ana Pérez",
        o.phone ?? "3513445566",
        o.type ?? "domicilio",
        o.addr === undefined ? "Av. Colón 123" : o.addr,
        o.at ?? hoursAhead(40),
        "08:00-09:00",
        null,
        3000,
        JSON.stringify(items),
      ],
    )
  )[0].r;

const ids: Record<string, string> = {};

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create schema storage;
    create function auth.jwt() returns jsonb language sql stable as
      $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid default gen_random_uuid() primary key, bucket_id text, name text);
    alter table storage.objects enable row level security;
    grant select, insert, update, delete on storage.objects to anon, authenticated, service_role; -- como en Supabase real
    grant usage on schema public, auth, storage to anon, authenticated, service_role;
    grant execute on function auth.jwt() to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  `);
  await db.exec(sql("supabase/migrations/0001_init.sql"));
  await db.exec(sql("supabase/seed.sql"));
  for (const p of await q<{ id: string; name: string }>("select id, name from products")) ids[p.name] = p.id;
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("migración y seed", () => {
  it("carga los 11 productos de la referencia y el seed es idempotente", async () => {
    expect((await q<{ n: number }>("select count(*)::int n from products"))[0].n).toBe(11);
    await db.exec(sql("supabase/seed.sql"));
    expect((await q<{ n: number }>("select count(*)::int n from products"))[0].n).toBe(11);
  });

  it("crea el bucket product-images con límite de 2 MB y solo imágenes", async () => {
    const [b] = await q<{ public: boolean; l: number; m: string[] }>(
      "select public, file_size_limit::int l, allowed_mime_types m from storage.buckets where id='product-images'",
    );
    expect(b).toEqual({ public: true, l: 2097152, m: ["image/jpeg", "image/png", "image/webp"] });
  });
});

describe("seguridad: anon (publishable key)", () => {
  it("lee productos pero nada más", async () => {
    await as("anon", null, async () => {
      expect(await q("select name from products")).toHaveLength(11);
      expect(await errorOf("select * from orders")).toMatch(/permission denied/);
      expect(await errorOf("select * from order_items")).toMatch(/permission denied/);
      expect(await errorOf("select * from whatsapp_messages")).toMatch(/permission denied/);
      expect(await errorOf("insert into orders(customer_name) values('x')")).toMatch(/permission denied/);
      expect(await errorOf("update products set price=1")).toMatch(/permission denied/);
      expect(
        await errorOf("select create_order('a','3513445566','retiro',null,now(),'08:00-09:00',null,3000,'[]')"),
      ).toMatch(/permission denied/);
    });
  });
});

describe("seguridad: usuario autenticado sin rol admin", () => {
  it("no gana permisos aunque ponga role=admin en user_metadata", async () => {
    await as("authenticated", USER, async () => {
      expect((await q<{ n: number }>("select count(*)::int n from orders"))[0].n).toBe(0);
      expect(await q("update products set price=1 returning id")).toHaveLength(0);
      expect(await errorOf("insert into products(name,price,section) values('Hack',1,'dulces')")).toMatch(
        /row-level security/,
      );
      expect(
        await errorOf("select create_order('a','3513445566','retiro',null,now(),'08:00-09:00',null,3000,'[]')"),
      ).toMatch(/permission denied/);
      expect(await errorOf("insert into storage.objects(bucket_id,name) values('product-images','x.png')")).toMatch(
        /row-level security/,
      );
    });
  });
});

describe("create_order (service_role)", () => {
  it("domicilio: recalcula desde la base, suma el envío y guarda snapshot y mensajes por unidad", async () => {
    await as("service_role", null, async () => {
      const r = await createOrder([
        { productId: ids["Caja Feliz Cumple"], qty: 2, messages: ["Feliz cumple", ""] },
        { productId: ids["Alfajores artesanales"], qty: 3, messages: [] },
      ]);
      expect(r).toMatchObject({ ok: true, id: 1001, subtotal: 86500, shipping_fee: 3000, total: 89500 });
      const items = await q<{ product_name: string; unit_price: number; messages: unknown[] }>(
        "select product_name, unit_price, messages from order_items where order_id=1001 order by product_name",
      );
      expect(items.map((i) => [i.product_name, i.unit_price])).toEqual([
        ["Alfajores artesanales", 7500],
        ["Caja Feliz Cumple", 32000],
      ]);
      expect(items[1].messages).toEqual(["Feliz cumple", ""]);
    });
  });

  it("retiro: sin envío y descarta la dirección", async () => {
    await as("service_role", null, async () => {
      const r = await createOrder([{ productId: ids["Alfajores artesanales"], qty: 1 }], {
        type: "retiro",
        addr: "Calle que se descarta 1",
        phone: "3854332211",
      });
      expect(r).toMatchObject({ ok: true, shipping_fee: 0, total: 7500 });
      expect((await q<{ address: string | null }>("select address from orders where id=$1", [r.id]))[0].address).toBeNull();
    });
  });

  it.each([
    ["mensaje en un dulce", [{ productId: "Alfajores artesanales", qty: 1, messages: ["hola"] }]],
    ["21 unidades de un producto", [{ productId: "Caja Feliz Cumple", qty: 21 }]],
    [
      "51 unidades en total",
      [
        { productId: "Caja Feliz Cumple", qty: 20 },
        { productId: "Alfajores artesanales", qty: 20 },
        { productId: "Pan casero", qty: 11 },
      ],
    ],
    [
      "producto repetido",
      [
        { productId: "Caja Feliz Cumple", qty: 20 },
        { productId: "Caja Feliz Cumple", qty: 20 },
      ],
    ],
    ["más mensajes que unidades", [{ productId: "Caja Feliz Cumple", qty: 1, messages: ["a", "b"] }]],
    ["mensaje de 151 caracteres", [{ productId: "Caja Feliz Cumple", qty: 1, messages: ["a".repeat(151)] }]],
    ["mensaje que no es texto", [{ productId: "Caja Feliz Cumple", qty: 1, messages: [{ x: 1 }] }]],
    ["cantidad cero", [{ productId: "Caja Feliz Cumple", qty: 0 }]],
  ])("rechaza: %s", async (_name, raw) => {
    await as("service_role", null, async () => {
      const before = (await q<{ n: number }>("select count(*)::int n from orders"))[0].n;
      const items = (raw as Item[]).map((i) => ({ ...i, productId: ids[i.productId] }));
      const r = await createOrder(items, { phone: "3512000001" });
      expect(r).toMatchObject({ ok: false, error: "invalid" });
      expect((await q<{ n: number }>("select count(*)::int n from orders"))[0].n).toBe(before);
    });
  });

  it("rechaza una entrega con menos de ~12 h de anticipación", async () => {
    await as("service_role", null, async () => {
      const r = await createOrder([{ productId: ids["Pan casero"], qty: 1 }], { at: hoursAhead(1), phone: "3512000002" });
      expect(r).toMatchObject({ ok: false, error: "invalid" });
    });
  });

  it("producto inexistente", async () => {
    await as("service_role", null, async () => {
      const r = await createOrder([{ productId: "00000000-0000-4000-8000-000000000000", qty: 1 }], { phone: "3512000003" });
      expect(r).toMatchObject({ ok: false, error: "missing" });
    });
  });

  it("límite: 4.º pedido pendiente del mismo teléfono en 1 h", async () => {
    await as("service_role", null, async () => {
      for (let i = 0; i < 3; i++) {
        expect(await createOrder([{ productId: ids["Pan casero"], qty: 1 }], { phone: "3519999999" })).toMatchObject({ ok: true });
      }
      expect(await createOrder([{ productId: ids["Pan casero"], qty: 1 }], { phone: "3519999999" })).toMatchObject({
        ok: false,
        error: "rate_limit",
      });
    });
  });

  it("producto oculto o no disponible: devuelve sus nombres y no crea el pedido (C16)", async () => {
    await as("service_role", null, async () => {
      await db.exec("update products set status='hidden' where name='Pan casero'");
      await db.exec("update products set status='unavailable' where name='Masitas finas'");
      const before = (await q<{ n: number }>("select count(*)::int n from orders"))[0].n;
      const r = await createOrder(
        ["Pan casero", "Masitas finas", "Alfajores artesanales"].map((n) => ({ productId: ids[n], qty: 1 })),
        { phone: "3512000004" },
      );
      expect(r).toEqual({ ok: false, error: "unavailable", names: ["Masitas finas", "Pan casero"] });
      expect((await q<{ n: number }>("select count(*)::int n from orders"))[0].n).toBe(before);
    });
  });

  it("cambiar el precio no altera pedidos viejos y un producto con pedidos no se borra (C27, C28)", async () => {
    await as("service_role", null, async () => {
      await db.exec("update products set price=99999 where name='Caja Feliz Cumple'");
      const [i] = await q<{ unit_price: number }>(
        "select unit_price from order_items where order_id=1001 and product_name='Caja Feliz Cumple'",
      );
      expect(i.unit_price).toBe(32000);
      expect(await errorOf("delete from products where name='Caja Feliz Cumple'")).toMatch(/foreign key/);
    });
  });
});

describe("restricciones de datos", () => {
  const base = (phone: string, extra = "") =>
    `insert into orders(customer_name,customer_phone,delivery_type,delivery_at,delivery_slot,subtotal,shipping_fee,total${extra ? ",address" : ""})
     values('Ana','${phone}','${extra ? "domicilio" : "retiro"}',now(),'08:00-09:00',1,0,1${extra ? `,'${extra}'` : ""})`;

  it.each(["0351344556", "1534455667", "351344556", "35134455667", "351-344556"])("teléfono inválido %s", async (p) => {
    await as("service_role", null, async () => {
      expect(await errorOf(base(p))).toMatch(/customer_phone_check/);
    });
  });

  it("domicilio exige dirección y total = subtotal + envío", async () => {
    await as("service_role", null, async () => {
      expect(
        await errorOf(
          "insert into orders(customer_name,customer_phone,delivery_type,delivery_at,delivery_slot,subtotal,shipping_fee,total) values('Ana','3513445566','domicilio',now(),'08:00-09:00',1,3000,3001)",
        ),
      ).toMatch(/orders_address_required/);
      expect(
        await errorOf(
          "insert into orders(customer_name,customer_phone,delivery_type,address,delivery_at,delivery_slot,subtotal,shipping_fee,total) values('Ana','3513445566','domicilio','Calle 12345',now(),'08:00-09:00',1,3000,9)",
        ),
      ).toMatch(/orders_total_consistent/);
    });
  });

  it("franja fuera de la lista", async () => {
    await as("service_role", null, async () => {
      expect(
        await errorOf(
          "insert into orders(customer_name,customer_phone,delivery_type,delivery_at,delivery_slot,subtotal,shipping_fee,total) values('Ana','3513445566','retiro',now(),'12:00-13:00',1,0,1)",
        ),
      ).toMatch(/delivery_slot_check/);
    });
  });
});

describe("administrador (app_metadata.role = admin)", () => {
  it("gestiona pedidos, productos, WhatsApp e imágenes", async () => {
    await as("authenticated", ADMIN, async () => {
      expect((await q<{ n: number }>("select count(*)::int n from orders"))[0].n).toBeGreaterThanOrEqual(5);
      expect((await q<{ n: number }>("select count(*)::int n from products"))[0].n).toBe(11); // incluye el 'hidden'
      expect(
        await q("update orders set status='confirmado', confirmed_at=now() where id=1001 and status='pendiente' returning id"),
      ).toHaveLength(1);
      expect(await q("update orders set status='confirmado' where id=1001 and status='pendiente' returning id")).toHaveLength(0);
      expect(await q("insert into products(name,price,section) values('Nuevo',100,'dulces') returning id")).toHaveLength(1);
      expect(await errorOf("delete from products where name='Nuevo'")).toMatch(/permission denied/);
      expect(await errorOf("insert into orders(customer_name) values('x')")).toMatch(/permission denied/);
      expect(
        await q("insert into whatsapp_messages(order_id,kind,status) values(1001,'customer_confirmed','sent') returning id"),
      ).toHaveLength(1);
      expect(
        await errorOf("insert into whatsapp_messages(order_id,kind,status) values(1001,'customer_confirmed','sent')"),
      ).toMatch(/duplicate key/);
      expect(await q("insert into storage.objects(bucket_id,name) values('product-images','x.png') returning id")).toHaveLength(1);
    });
  });

  it("anon sigue sin ver el producto dado de baja (C3)", async () => {
    await as("anon", null, async () => {
      expect(await q("select id from products where name='Pan casero'")).toHaveLength(0);
      expect((await q<{ n: number }>("select count(*)::int n from products"))[0].n).toBe(11);
    });
  });
});
