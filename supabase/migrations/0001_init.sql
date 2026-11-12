-- Tienda "Buen Día" — esquema inicial (T5). Ver specs/tienda-buen-dia/plan.md §4.2–§4.3.
-- Se ejecuta UNA vez en Supabase > SQL Editor. No contiene secretos.

-- ---------------------------------------------------------------- tipos
create type public.product_section as enum ('desayunos', 'tortas', 'dulces');
create type public.product_status  as enum ('active', 'unavailable', 'hidden');
create type public.delivery_type   as enum ('domicilio', 'retiro');
create type public.order_status    as enum ('pendiente', 'confirmado', 'entregado', 'cancelado');
create type public.wa_kind         as enum ('admin_new_order', 'customer_confirmed', 'customer_cancelled');
create type public.wa_status       as enum ('sent', 'failed');

-- ---------------------------------------------------------------- helpers
-- Administrador = usuario con app_metadata.role = 'admin'. app_metadata solo lo modifica el servidor
-- (a diferencia de user_metadata, que edita el propio usuario).
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

-- ---------------------------------------------------------------- tablas
create table public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 120),
  description text not null default '' check (char_length(description) <= 500),
  price       integer not null check (price > 0),
  section     public.product_section not null,
  motive      text check (motive is null or char_length(motive) between 1 and 40),
  image_url   text check (image_url is null or char_length(image_url) <= 500),
  status      public.product_status not null default 'active',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index products_section_status_idx on public.products (section, status, sort_order);
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

create table public.orders (
  id             bigint generated always as identity (start with 1001) primary key,
  customer_name  text not null check (char_length(customer_name) between 2 and 80),
  -- 10 dígitos, característica sin 0 y sin 15 (misma regla que lib/domain/phone.ts)
  customer_phone text not null check (customer_phone ~ '^(?!15)[1-9][0-9]{9}$'),
  delivery_type  public.delivery_type not null,
  address        text check (address is null or char_length(address) between 5 and 200),
  delivery_at    timestamptz not null,
  delivery_slot  text not null check (delivery_slot in (
                   '07:00-08:00','08:00-09:00','09:00-10:00','10:00-11:00','11:00-12:00',
                   '16:00-17:00','17:00-18:00','18:00-19:00')),
  note           text check (note is null or char_length(note) <= 300),
  subtotal       integer not null check (subtotal >= 0),
  shipping_fee   integer not null check (shipping_fee >= 0),
  total          integer not null,
  status         public.order_status not null default 'pendiente',
  created_at     timestamptz not null default now(),
  confirmed_at   timestamptz,
  constraint orders_address_required check (delivery_type = 'retiro' or address is not null),
  constraint orders_total_consistent check (total = subtotal + shipping_fee)
);
create index orders_status_created_idx on public.orders (status, created_at desc);
create index orders_phone_created_idx  on public.orders (customer_phone, created_at desc);

create table public.order_items (
  id           bigint generated always as identity primary key,
  order_id     bigint not null references public.orders (id) on delete cascade,
  -- on delete restrict: un producto con pedidos no se borra; la "baja" es status = 'hidden'.
  product_id   uuid not null references public.products (id) on delete restrict,
  -- Copia de nombre y precio al momento del pedido (los cambios posteriores no los alteran).
  product_name text not null,
  section      public.product_section not null,
  unit_price   integer not null check (unit_price > 0),
  qty          integer not null check (qty between 1 and 20),
  -- Un mensaje personalizado por unidad (hasta qty); [] si no hay personalización.
  messages     jsonb not null default '[]'::jsonb,
  constraint order_items_messages_shape check (
    jsonb_typeof(messages) = 'array' and jsonb_array_length(messages) <= qty
  )
);
create index order_items_order_idx on public.order_items (order_id);

create table public.whatsapp_messages (
  id         bigint generated always as identity primary key,
  order_id   bigint not null references public.orders (id) on delete cascade,
  kind       public.wa_kind not null,
  status     public.wa_status not null,
  error_code text,
  attempts   integer not null default 1,
  created_at timestamptz not null default now(),
  sent_at    timestamptz,
  -- Una fila por tipo y pedido: los reintentos suman attempts; evita mensajes duplicados.
  unique (order_id, kind)
);

-- ---------------------------------------------------------------- permisos (defensa en profundidad)
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select on public.products to anon, authenticated;
grant insert, update on public.products to authenticated;                 -- sin delete para nadie
grant select, update on public.orders to authenticated;                    -- insert solo vía create_order
grant select on public.order_items to authenticated;
grant select, insert, update on public.whatsapp_messages to authenticated;
grant usage on sequence public.whatsapp_messages_id_seq to authenticated;

grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ---------------------------------------------------------------- RLS
alter table public.products          enable row level security;
alter table public.orders            enable row level security;
alter table public.order_items       enable row level security;
alter table public.whatsapp_messages enable row level security;

-- Público: solo productos visibles (activo o no disponible). 'hidden' = baja, no se lee.
create policy products_public_read on public.products
  for select to anon, authenticated
  using (status in ('active', 'unavailable'));
create policy products_admin_read on public.products
  for select to authenticated using (public.is_admin());
create policy products_admin_insert on public.products
  for insert to authenticated with check (public.is_admin());
create policy products_admin_update on public.products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Pedidos: sin ninguna política para anon. Lectura y cambio de estado solo admin.
create policy orders_admin_read on public.orders
  for select to authenticated using (public.is_admin());
create policy orders_admin_update on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy order_items_admin_read on public.order_items
  for select to authenticated using (public.is_admin());
create policy whatsapp_admin_read on public.whatsapp_messages
  for select to authenticated using (public.is_admin());
create policy whatsapp_admin_insert on public.whatsapp_messages
  for insert to authenticated with check (public.is_admin());
create policy whatsapp_admin_update on public.whatsapp_messages
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- create_order
-- Única vía de creación de pedidos. La llama la Server Action con la secret key (rol service_role).
-- Recalcula todo desde la base: el cliente nunca define precios. Devuelve jsonb:
--   { ok: true, id, subtotal, shipping_fee, total }
--   { ok: false, error: 'rate_limit' | 'invalid' | 'missing' | 'unavailable', names?: [...] }
create or replace function public.create_order(
  p_name          text,
  p_phone         text,
  p_delivery_type public.delivery_type,
  p_address       text,
  p_delivery_at   timestamptz,
  p_slot          text,
  p_note          text,
  p_shipping_fee  integer,
  p_items         jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  c_max_per_product constant integer := 20;
  c_max_total       constant integer := 50;
  c_message_max     constant integer := 150;
  v_count      integer;
  v_units      integer;
  v_distinct   integer;
  v_found      integer;
  v_names      text[];
  v_subtotal   integer;
  v_shipping   integer;
  v_order_id   bigint;
begin
  -- Entrada mínima coherente (la validación completa ya ocurrió en el servidor; esto es la última barrera).
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0
     or p_shipping_fee is null or p_shipping_fee < 0
     or p_delivery_at is null or p_delivery_at < now() + interval '11 hours 55 minutes' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  -- Anti-abuso: máx. 3 pendientes por teléfono por hora y 60 pedidos por hora en total.
  select count(*) into v_count from orders
   where customer_phone = p_phone and status = 'pendiente' and created_at > now() - interval '1 hour';
  if v_count >= 3 then
    return jsonb_build_object('ok', false, 'error', 'rate_limit');
  end if;
  select count(*) into v_count from orders where created_at > now() - interval '1 hour';
  if v_count >= 60 then
    return jsonb_build_object('ok', false, 'error', 'rate_limit');
  end if;

  create temporary table tmp_cart on commit drop as
    select (x."productId")::uuid as product_id, x.qty, coalesce(x.messages, '[]'::jsonb) as messages
      from jsonb_to_recordset(p_items) as x("productId" uuid, qty integer, messages jsonb);

  select coalesce(sum(qty), 0), count(distinct product_id), count(*)
    into v_units, v_distinct, v_count from tmp_cart;
  if v_units > c_max_total or v_distinct <> v_count
     or exists (select 1 from tmp_cart where qty is null or qty < 1 or qty > c_max_per_product)
     or exists (select 1 from tmp_cart where jsonb_typeof(messages) <> 'array'
                                           or jsonb_array_length(messages) > qty) then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  -- Bloquea los productos del pedido mientras dura la transacción (un admin no los cambia a mitad).
  perform 1 from products where id in (select product_id from tmp_cart) for share;

  select count(*) into v_found from products where id in (select product_id from tmp_cart);
  if v_found <> v_count then
    return jsonb_build_object('ok', false, 'error', 'missing');
  end if;

  select array_agg(p.name order by p.name) into v_names
    from products p join tmp_cart c on c.product_id = p.id
   where p.status <> 'active';
  if v_names is not null then
    return jsonb_build_object('ok', false, 'error', 'unavailable', 'names', to_jsonb(v_names));
  end if;

  -- Mensajes solo en desayunos y tortas; cada uno de hasta 150 caracteres.
  if exists (
    select 1
      from tmp_cart c
      join products p on p.id = c.product_id
     where jsonb_array_length(c.messages) > 0
       and ( p.section = 'dulces'
             or exists (select 1 from jsonb_array_elements(c.messages) m
                         where jsonb_typeof(m) <> 'string' or char_length(m #>> '{}') > c_message_max) )
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  select sum(p.price * c.qty) into v_subtotal
    from tmp_cart c join products p on p.id = c.product_id;
  v_shipping := case when p_delivery_type = 'domicilio' then p_shipping_fee else 0 end;

  insert into orders (customer_name, customer_phone, delivery_type, address, delivery_at,
                      delivery_slot, note, subtotal, shipping_fee, total)
  values (p_name, p_phone, p_delivery_type,
          case when p_delivery_type = 'domicilio' then p_address else null end,
          p_delivery_at, p_slot, p_note,
          v_subtotal, v_shipping, v_subtotal + v_shipping)
  returning id into v_order_id;

  insert into order_items (order_id, product_id, product_name, section, unit_price, qty, messages)
  select v_order_id, p.id, p.name, p.section, p.price, c.qty, c.messages
    from tmp_cart c join products p on p.id = c.product_id;

  return jsonb_build_object('ok', true, 'id', v_order_id, 'subtotal', v_subtotal,
                            'shipping_fee', v_shipping, 'total', v_subtotal + v_shipping);
end
$$;

-- Por defecto Postgres da EXECUTE a PUBLIC: se quita y se concede solo a service_role.
revoke all on function public.create_order(text, text, public.delivery_type, text, timestamptz, text, text, integer, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_order(text, text, public.delivery_type, text, timestamptz, text, text, integer, jsonb)
  to service_role;

-- ---------------------------------------------------------------- Storage: imágenes de productos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Lectura pública por URL (bucket público); escritura solo admin.
create policy product_images_admin_select on storage.objects
  for select to authenticated using (bucket_id = 'product-images' and public.is_admin());
create policy product_images_admin_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
create policy product_images_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());
create policy product_images_admin_delete on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());
