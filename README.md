# Dulce Despertar — Tienda online

Tienda de desayunos, tortas y dulces con carrito, pedido sin registro de cliente y panel de administración. Next.js 16 (App Router, `cacheComponents`), Supabase (Postgres + Auth + Storage) y Resend para el aviso por correo.

Documentación de diseño en [`specs/tienda-buen-dia/`](specs/tienda-buen-dia): `spec.md` (qué), `plan.md` (cómo), `tasks.md` (tareas) y `verify.md` (verificación final).

## Requisitos

- Node.js 20.9 o superior y npm.
- Un proyecto en [Supabase](https://supabase.com).
- Una cuenta en [Resend](https://resend.com) con un dominio verificado (solo para el aviso de pedidos).

## Variables de entorno

Copiar `.env.example` a `.env.local` (no se versiona) y completar:

| Variable | Uso | Dónde se usa |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL base del proyecto, sin `/rest/v1/` | navegador y servidor |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_…`), pública | navegador y servidor |
| `SUPABASE_SECRET_KEY` | Secret key (`sb_secret_…`). **Solo servidor** | `lib/supabase/secret.ts` |
| `RESEND_API_KEY` | Clave de Resend. **Solo servidor** | `lib/email.ts` |
| `EMAIL_FROM` | Remitente con dominio verificado, ej. `Dulce Despertar <pedidos@tudominio.com>` | `lib/email.ts` |
| `NEXT_PUBLIC_STORE_ADDRESS` | Dirección del local para retiros, ej. `Suipacha 193`. Pública; se fija en el build | `lib/config.ts` |
| `NEXT_PUBLIC_PAYMENT_ALIAS` | Alias para transferencias, ej. `dulce.despertar.mp`. Público; se fija en el build | `lib/config.ts` |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Opcional: solo si se despliega en varias instancias | Next.js |
| `SUPABASE_ACCESS_TOKEN` | Opcional: solo para `scripts/apply-sql.mjs` | scripts |

Nunca usar el prefijo `NEXT_PUBLIC_` en las claves secretas. Se verificó que ni `sb_secret_`, ni `SUPABASE_SECRET_KEY`, ni `RESEND_API_KEY` ni sus valores aparecen en `.next/static`.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # completar valores
npm run dev                  # http://localhost:3000
```

Otros comandos: `npm test` (vitest), `npm run lint`, `npm run build`, `npm start`.

## Supabase

1. Crear el proyecto y copiar URL, publishable key y secret key (Project Settings → API Keys) a `.env.local`.
2. Aplicar el esquema y los datos semilla (tablas, enums, RLS, bucket `product-images`, RPC `create_order`):
   - desde el SQL Editor de Supabase pegando `supabase/migrations/0001_init.sql` y luego `supabase/seed.sql`, o
   - con `node --env-file=.env.local scripts/apply-sql.mjs supabase/migrations/0001_init.sql` (requiere `SUPABASE_ACCESS_TOKEN`); repetir con `supabase/seed.sql`.
3. Verificar permisos contra el proyecto real:

   ```bash
   node --env-file=.env.local scripts/verify-remote.mjs
   ```

   Comprueba que `anon` solo lee productos visibles, no lee ni escribe pedidos ni ejecuta `create_order`, y que con la secret key `create_order` calcula el total correcto. Los pedidos de prueba se borran al terminar.

Las pruebas de esquema (`supabase/tests/schema.test.ts`) corren localmente con PGlite, sin necesidad de Supabase.

## Administrador

El panel está en `/admin` (sin enlaces desde la tienda pública). Solo accede un usuario de Supabase Auth con `app_metadata.role = 'admin'` (nunca `user_metadata`).

```bash
ADMIN_EMAIL=admin@ejemplo.com ADMIN_PASSWORD='una-clave-larga' \
  node --env-file=.env.local scripts/create-admin.mjs
```

Se puede repetir para más administradores; **todos** reciben el correo de cada pedido nuevo. Para cambiar una clave:

```bash
ADMIN_EMAIL=... ADMIN_PASSWORD=... node --env-file=.env.local scripts/reset-admin-password.mjs
```

La clave se lee del entorno solo durante la ejecución y no se guarda en ningún archivo.

Desde el panel se confirman, cancelan y entregan pedidos, y se gestionan productos (`/admin/productos`): alta con imagen (JPG/PNG/WebP, máx. 2 MB), edición, precio, estado `active` / `unavailable` / `hidden`. Los productos no se borran; "baja" es `hidden`.

## Aviso por correo (Resend)

Al crearse un pedido, `submitOrder` dispara con `after()` un correo a todos los administradores con el detalle y el WhatsApp del cliente como enlace `https://wa.me/549…`. No hay mensajes automáticos al cliente: el administrador le escribe a mano. Si el envío falla, el pedido se conserva y solo se registra el error.

1. Crear una API key en Resend y verificar el dominio del remitente.
2. Completar `RESEND_API_KEY` y `EMAIL_FROM` en `.env.local` (y en el hosting).

## Reglas de negocio (resumen)

- Envío a domicilio: `$3.000` (`SHIPPING_FEE` en `lib/config.ts`); retiro en local sin costo.
- Anticipación mínima de 12 h; zona horaria fija Argentina (UTC-3); 8 franjas de una hora.
- Máximo 20 unidades por producto y 50 por pedido.
- Mensaje personalizado (hasta 150 caracteres) por unidad, solo en desayunos y tortas.
- Teléfono argentino de 10 dígitos, sin `0` ni `15` (ej. `351-3445566`).
- El servidor recalcula precios y totales desde la base; nunca confía en lo que envía el cliente.
- Límite anti-abuso en la RPC `create_order` (pedidos pendientes por teléfono) y campo honeypot en el formulario.

Antes de producción, definir `NEXT_PUBLIC_STORE_ADDRESS` y `NEXT_PUBLIC_PAYMENT_ALIAS` (si faltan se muestra un texto provisional). Al ser `NEXT_PUBLIC_`, hay que volver a hacer el build para que cambie.

## Despliegue

Pensado para Vercel (o cualquier hosting Node con Next.js 16):

1. Cargar las variables de entorno de la tabla anterior en el hosting.
2. `npm run build` debe terminar sin errores; `npm start` sirve el resultado.
3. Si hay más de una instancia, definir `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` con el mismo valor en todas.
4. Las imágenes de producto se sirven desde el bucket público `product-images` de Supabase; `next.config.ts` ya autoriza ese dominio en `images.remotePatterns` (depende de `NEXT_PUBLIC_SUPABASE_URL` en el build).
5. `proxy.ts` protege `/admin/*` y cada página/acción del panel vuelve a verificar el rol (`lib/dal.ts`).
