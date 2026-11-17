# Tasks: Tienda online "Buen Día"

Fase 4 (TASKS). Deriva de [`plan.md`](plan.md) y [`spec.md`](spec.md). Se marca `[x]` al cerrar cada tarea.
Regla: una tarea a la vez; no se pasa a la siguiente hasta que su `done` se cumple y el usuario lo aprueba.
Antes de escribir código de Next.js en cualquier tarea, releer la guía correspondiente de `node_modules/next/dist/docs/` (ver `AGENTS.md`).
Cierre común de toda tarea: `npm run lint` y `npm run build` sin errores ni warnings nuevos.

## Bloque A: Base

- [x] **T1. Dependencias, entorno y pruebas**
  - Depende de: nada.
  - Hacer: instalar `@supabase/supabase-js`, `@supabase/ssr`, `zod` y, como dev, `vitest`; agregar script `test`; crear `.env.example` con las variables del plan §8 (sin valores); agregar `!.env.example` a `.gitignore`; crear `lib/config.ts` con las constantes del plan §4.1.
  - Done: `npm test` corre y pasa con una prueba trivial de `config` (8 franjas, `SHIPPING_FEE=3000`); `git check-ignore .env.local` ignora y `git check-ignore .env.example` no; build ok.

- [x] **T2. Estilos, fuentes y layout global**
  - Depende de: T1.
  - Hacer: copiar `resources/index/img/*` a `public/img/`; portar a `app/globals.css` las variables y clases de la referencia (líneas 11–163); cargar Fraunces con `next/font/google` en `app/layout.tsx`; `lang="es"` y metadata "Buen Día — Desayunos, Tortas y Dulces".
  - Done (C29): una página temporal con header, hero y una tarjeta se ve igual que la referencia abierta en el navegador (colores, tipografías, espaciados) a 360, 768 y 1280 px.

## Bloque B: Lógica de dominio (pura, sin red)

- [x] **T3. Reglas de dominio**
  - Depende de: T1.
  - Hacer: `lib/domain/` con `money.ts` (formato `es-AR`), `phone.ts`, `slots.ts`, `pricing.ts`, `messages.ts` (texto del correo al admin), según plan §4.5.
  - Done (C7, C12, C13): pruebas `vitest` pasan para: `351-3445566` y `385-4332211` válidos; `0351…`, `15…`, `+54…`, 9 y 11 dígitos inválidos; `toWhatsappId('351-3445566')` = `5493513445566`; con ahora = lunes 20:00 la primera franja elegible es martes 08:00–09:00; exactamente 12 h válido y 11 h 59 min inválido; `computeTotals` domicilio = subtotal + 3000 y retiro = subtotal.

- [x] **T4. Esquema de validación del pedido**
  - Depende de: T3.
  - Hacer: `lib/domain/order-schema.ts` con el esquema `zod` y el orden de validaciones del plan §4.4 (honeypot, tope 20/50, mensajes solo en desayunos/tortas, ≤150 caracteres, nombre, teléfono, dirección, fecha/franja).
  - Done (C8–C13): pruebas pasan para cada caso inválido con su mensaje de error por campo y para un pedido válido de domicilio y uno de retiro; un mensaje en un dulce se rechaza; 21 unidades de un producto y 51 en total se rechazan.

## Bloque C: Datos

- [x] **T5. Migración y datos semilla de Supabase**
  - Depende de: T1. Requiere del usuario: proyecto Supabase creado.
  - Hacer: `supabase/migrations/0001_init.sql` con tablas, enums, checks, índices, RLS, bucket `product-images` y la RPC `create_order` (plan §4.2–§4.3, incluido el límite anti-abuso); `supabase/seed.sql` con los 11 productos de la referencia (líneas 273–285); instrucciones para crear el admin con `app_metadata.role='admin'` (en `README`).
  - Done (C1–C3, C18, C27, C28): aplicada la migración, verificar con la publishable key (rol `anon`): lee productos `active` y `unavailable`, no lee `hidden`, no lee `orders` ni `order_items`, no puede insertar en `orders` ni ejecutar `create_order`. Con la secret key (rol `service_role`), `create_order` crea un pedido con total correcto y rechaza un producto `hidden` devolviendo su nombre.

- [x] **T6. Clientes Supabase y catálogo cacheado**
  - Depende de: T5.
  - Hacer: `lib/supabase/publishable.ts`, `server.ts`, `secret.ts` (esta última con `import 'server-only'`); `lib/catalog.ts` con `getCatalog()` (`use cache`, `cacheTag('products')`, `cacheLife('minutes')`) y agrupación de motivos.
  - Done (C1–C4): una página temporal lista los productos desde la base; un producto `hidden` no aparece y uno `unavailable` aparece con su estado; build ok con `cacheComponents` sin errores de bloqueo.

## Bloque D: Tienda pública

- [x] **T7. Catálogo público**
  - Depende de: T2, T6.
  - Hacer: componentes `store/*` y `app/page.tsx` replicando la referencia; chips de motivo en desayunos y tortas; `next/image` con `remotePatterns` del dominio de Supabase en `next.config.ts`; pie sin enlace al panel.
  - Done (C1–C4, C19, C29): se ven las tres secciones con los datos de la base; filtrar por motivo muestra solo ese motivo; productos no disponibles muestran su etiqueta y botón deshabilitado; el HTML de `/` no contiene "admin".

- [x] **T8. Carrito**
  - Depende de: T3, T7.
  - Hacer: `CartProvider` (reductor puro + `localStorage` hidratado tras montar), botón agregar/stepper en tarjetas, contador del header, conciliación con el catálogo.
  - Done (C5, C8, C9 parcial): pruebas del reductor pasan (agregar, quitar, topes 20/50, recorte de mensajes al bajar la cantidad); manual: recargar conserva el carrito y el contador se actualiza al instante; un producto que dejó de estar activo se descarta con aviso.

- [x] **T9. Drawer: carrito y personalización**
  - Depende de: T8.
  - Hacer: `CartDrawer` accesible (rol dialog, overlay, Escape, foco), paso Carrito con subtotal, línea de envío y total según entrega, y el bloque "Agregar mensaje personalizado" con un campo por unidad solo para desayunos y tortas.
  - Done (C6, C9): con 3 unidades de una caja aparecen 3 campos independientes de máximo 150 caracteres; los dulces no muestran la opción; con carrito vacío no hay botón "Finalizar pedido".

## Bloque E: Pedido

- [x] **T10. Server Action `submitOrder`**
  - Depende de: T4, T5, T6.
  - Hacer: `lib/actions/orders.ts`: validar con el esquema, llamar la RPC con la secret key, devolver errores por campo o lista de productos no disponibles; sin aviso al admin todavía; errores genéricos hacia el cliente.
  - Done (C7, C10–C16): pruebas con dependencias simuladas pasan; manual contra la base: un pedido válido crea fila `pendiente` con total igual al calculado; precio manipulado en el cliente se ignora; producto pasado a `unavailable` tras armar el carrito devuelve su nombre y no crea pedido; el honeypot lleno no crea pedido.

- [x] **T11. Drawer: checkout y confirmación**
  - Depende de: T9, T10.
  - Hacer: pasos Datos y Confirmado de la referencia (líneas 357–405) conectados con `useActionState`; campo oculto de honeypot; franjas deshabilitadas según la regla de 12 h (cálculo en cliente tras montar); pantalla final con id de pedido, resumen, envío, medios de pago (efectivo al retirar o transferencia al alias `BUENDIA.DESAYUNOS`) y aviso de 30 min; vaciar el carrito al confirmar.
  - Done (C10–C15): flujo completo en navegador: errores por campo visibles; domicilio pide dirección y retiro muestra la dirección del local; pedido válido queda `pendiente` en la base, el carrito se vacía y se ve el id; no hay ninguna pantalla de registro.

## Bloque F: Avisos

- [~] **T12. ~~Módulo WhatsApp y registro de envíos~~ — DESCARTADA**
  - Motivo: los mensajes automáticos al cliente tienen costo. El administrador le escribe a mano desde su WhatsApp usando el enlace `wa.me` del correo (T13). Se retomará solo si el volumen de pedidos supera su capacidad de respuesta; en ese caso, el diseño original está en el historial de git de `plan.md` §4.8.

- [x] **T13. Aviso de pedido nuevo a los administradores por correo**
  - Depende de: T10.
  - Hacer: `lib/email.ts` (Resend vía `fetch`, timeout 8 s; destinatarios = usuarios con `app_metadata.role='admin'` leídos con `auth.admin.listUsers`); `buildAdminEmail` en `lib/domain/messages.ts` (texto + HTML, con el número del cliente como enlace `https://wa.me/549…`); en `submitOrder`, `after()` que envía el correo. Variables `RESEND_API_KEY` y `EMAIL_FROM`.
  - Done (C17): al crear un pedido la respuesta al cliente no espera al envío; los administradores reciben un correo con el detalle y el enlace `wa.me` al cliente (los datos del cliente van escapados en el HTML); si el envío falla solo se registra el error (sin clave ni correos) y el pedido existe igual. Pruebas con dependencias simuladas pasan.

## Bloque G: Administración

- [x] **T14. Autenticación del administrador**
  - Depende de: T6.
  - Hacer: `lib/dal.ts` con `verifyAdmin()`, `app/admin/login/page.tsx`, acciones `login`/`logout`, `proxy.ts` con `matcher: ['/admin/:path*']`, `app/admin/layout.tsx` con `noindex`.
  - Done (C18, C19): sin sesión, `/admin` y `/admin/productos` redirigen al login; credenciales erróneas muestran "Credenciales inválidas" sin detalles; un usuario autenticado sin `role=admin` no accede; con admin accede y puede cerrar sesión; la cookie es `httpOnly`.

- [x] **T15. Panel de pedidos**
  - Depende de: T11, T14.
  - Hacer: `app/admin/page.tsx` con estadísticas y lista (estilos `.stats`, `.order`, `.pill`, `.timer` de la referencia), `OrderCountdown`, mensajes personalizados por unidad, refresco cada 30 s, filtro por estado.
  - Done (C20, C25): un pedido de prueba muestra todos los campos del criterio 20, incluidos los mensajes por unidad; el contador pasa de "Quedan X min" a "Demorado X min" pasados 30 minutos; la lista se actualiza sola al entrar un pedido nuevo.

- [ ] **T16. Confirmar, cancelar y entregar**
  - Depende de: T15.
  - Hacer: acciones `confirmOrder`, `cancelOrder`, `markDelivered` con transiciones atómicas (`where status=…`) y botones en `OrderCard`. Sin envío de mensajes.
  - Done (C21, C22, C24): confirmar un pendiente lo pasa a `confirmado` y cancelar a `cancelado`, sin enviar ningún mensaje; confirmar o cancelar dos veces seguidas solo aplica la primera; entregar un `pendiente` o cancelar un `confirmado` es rechazado.

- [ ] **T17. Gestión de productos**
  - Depende de: T14, T7.
  - Hacer: `app/admin/productos` (listado con filtros por sección y estado, alta y edición), `uploadProductImage` (tipo y tamaño validados en servidor, 2 MB), acciones `saveProduct` y `setProductStatus`, `updateTag('products')`, `bodySizeLimit` de `3mb` en `next.config.ts`.
  - Done (C26–C28): crear un producto con imagen lo hace visible en `/` de inmediato; marcarlo `unavailable` lo muestra sin botón; `hidden` lo quita; cambiar su precio no modifica un pedido anterior; un pedido viejo con un producto `hidden` sigue abriéndose en el panel; una imagen de 3 MB o un archivo no imagen es rechazado.

## Bloque H: Cierre

- [ ] **T18. Verificación final**
  - Depende de: T1–T17.
  - Hacer: recorrer cada criterio C1–C29 con la tabla del plan §5 y anotar la observación; revisar responsive y teclado; buscar `sb_secret_`, `SUPABASE_SECRET_KEY` y `RESEND_API_KEY` en `.next/static` (0 resultados); completar `README` (variables, Supabase, admin, Resend, despliegue).
  - Done: tabla criterio → observación completa y sin fallos en `specs/tienda-buen-dia/verify.md`; `npm test`, `npm run lint` y `npm run build` sin errores.

## Orden y dependencias

```
T1 → T2
T1 → T3 → T4
T1 → T5 → T6
T2,T6 → T7 → T8 → T9
T4,T5,T6 → T10;  T9,T10 → T11
T10 → T13  (T12 descartada)
T6 → T14;  T11,T14 → T15;  T15 → T16;  T14,T7 → T17
T1–T17 (salvo T12) → T18
```

## Datos que debe aportar el usuario

- **Antes de T5:** proyecto Supabase (URL base, publishable key, secret key) y el correo y clave del primer administrador.
- **Antes de probar T13:** `RESEND_API_KEY` y `EMAIL_FROM` (remitente con dominio verificado en Resend) en `.env.local`.
- **Antes de T11:** dirección real del local (hasta entonces se usa un texto provisional).
