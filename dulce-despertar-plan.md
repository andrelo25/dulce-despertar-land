> **Reemplazado** por [`specs/tienda-buen-dia/`](specs/tienda-buen-dia/) (`spec.md`, `plan.md`, `tasks.md`). Este archivo queda solo como historial.


# Plan: Tienda online "Buen Día" (cajas de desayuno, tortas y dulces)

## Top-Level Overview

**Goal:** Sitio de pedidos sin registro de cliente. El cliente navega Desayunos / Tortas / Dulces, arma un carrito, ingresa nombre, WhatsApp, forma de entrega (domicilio o retiro), dirección (solo domicilio) y fecha/horario estimado, y confirma. El pedido se guarda; el administrador lo confirma en menos de 30 min desde un panel y el sistema envía el detalle al cliente por WhatsApp (pago + detalles). El administrador gestiona productos (alta, edición, no disponible, baja).

**Visual reference:** [`resources/index/index.html`](resources/index/index.html) — se replica el diseño (paleta crema/cacao/terracota, tipografía Fraunces + Geist, header sticky, hero, pasos, grillas con chips por motivo, banda, drawer de carrito con 3 pasos, panel admin). Imágenes en `resources/index/img/*.png`.

**Decisions confirmadas con el usuario**
- Todo en Next.js (App Router) con base hospedada **Supabase** (Postgres + Storage de imágenes + Auth para el admin con email/clave).
- WhatsApp **automático** con WhatsApp Business Cloud API (Meta), plantillas aprobadas.
- Panel `/admin`: lista de pedidos con contador de 30 min; estados `pendiente → confirmado → entregado / cancelado`; aviso al admin **solo por WhatsApp** (sin email) cuando entra un pedido nuevo.
- Productos: nombre, descripción, precio, sección, motivo (editable), imagen, orden; estados `activo` / `no disponible` / `oculto (baja lógica)`. Pedido guarda snapshot de nombre y precio.
- Horarios de entrega y datos del local de retiro **fijos en código** (constantes).
- Sin registro de usuario: solo se pide nombre y teléfono WhatsApp.

**Constraints / notas**
- [`AGENTS.md`](AGENTS.md): esta versión de Next.js (16.4.6) tiene cambios incompatibles; antes de escribir código leer la guía relevante en `node_modules/next/dist/docs/01-app/` (p. ej. `01-getting-started/15-route-handlers.md`, `02-guides/forms.md`, `02-guides/server-actions.md`, `02-guides/authentication.md`, `02-guides/data-security.md`, `03-api-reference/03-file-conventions/proxy.md`, `02-guides/environment-variables.md`). Nótese que `middleware` se documenta como `proxy` en esta versión.
- Estado actual del proyecto: scaffold por defecto de create-next-app ([`app/page.tsx`](app/page.tsx), [`app/layout.tsx`](app/layout.tsx), [`app/globals.css`](app/globals.css) con Tailwind 4). El diseño de referencia usa CSS plano; el layout actual carga Geist (coincide con `font-family:Geist` de la referencia) y falta cargar Fraunces.
- Seguridad (reglas del proyecto): secretos solo en variables de entorno (`.env.local` en `.gitignore`); `SUPABASE_SECRET_KEY` y token de WhatsApp solo en servidor; validación server-side de todo input del pedido; mensajes de error genéricos al cliente; no loguear teléfonos/tokens; HTTPS para APIs externas con timeouts; RLS activo en todas las tablas; dependencias en última versión estable con lockfile.
- Los precios y totales **se recalculan en el servidor** desde la base; el cliente nunca define precios.
- WhatsApp Cloud API: mensajes iniciados por el negocio fuera de la ventana de 24 h requieren **plantilla aprobada** por Meta (el cliente no escribió antes). Requiere cuenta Meta Business, número verificado y plantillas: `pedido_confirmado` (cliente) y `pedido_nuevo` (admin). Hasta aprobar plantillas, el envío debe poder fallar sin romper el flujo (se registra el error y el admin puede reintentar / usar enlace `wa.me` de respaldo).

**Arquitectura (resumen)**

```
Cliente (/)  --lee-->  Supabase (productos activos, RLS lectura pública)
Cliente      --POST pedido--> Server Action / Route Handler --> valida + recalcula --> Supabase (orders, order_items)
                                                              \--> WhatsApp API: aviso al admin
Admin (/admin, Supabase Auth) --> lista pedidos / CRUD productos
Admin "Confirmar" --> Server Action --> status=confirmado --> WhatsApp API: plantilla al cliente
```

---

## Sub-Tasks

### 1. Infraestructura base y diseño global
**Intent:** Preparar proyecto, dependencias, variables de entorno y estilos/fuentes del diseño de referencia.
**Expected Outcomes:** `npm run dev` levanta con el tema visual de la referencia (colores, tipografías, componentes base) y las imágenes disponibles en `public/`.
**Todo List:**
1. Leer las guías de Next 16 indicadas arriba.
2. Instalar `@supabase/supabase-js` y `@supabase/ssr` (últimas versiones estables).
3. Crear `.env.example` (URL y publishable key de Supabase, secret key, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `ADMIN_WHATSAPP`, etc.); asegurar que `.env*.local` está en [`.gitignore`](.gitignore).
4. Mover/copiar `resources/index/img/*` a `public/img/` (imágenes semilla).
5. Portar las variables CSS y clases de la referencia a [`app/globals.css`](app/globals.css) (o CSS Modules por componente), conservando `--cream`, `--cocoa`, `--accent`, `--butter`, etc.
6. Cargar Fraunces con `next/font/google` en [`app/layout.tsx`](app/layout.tsx); actualizar `lang="es"` y metadata (título "Buen Día — Desayunos, Tortas y Dulces").
7. Constantes fijas en un módulo de config: nombre del negocio, dirección del local, horarios de entrega (`07:00 – 08:00` … `18:00 – 19:00`), anticipación de tortas.
**Relevant Context:** [`resources/index/index.html`](resources/index/index.html) líneas 11–163 (CSS); [`app/layout.tsx`](app/layout.tsx); [`package.json`](package.json).
**Status:** `[ ] pending`

### 2. Modelo de datos en Supabase (esquema, RLS, Storage)
**Intent:** Definir persistencia de productos, motivos, pedidos y administradores con seguridad a nivel de fila.
**Expected Outcomes:** Migración SQL versionada en el repo; tablas creadas; bucket de imágenes; datos semilla equivalentes a los 11 productos de la referencia.
**Todo List:**
1. Tabla `products`: `id`, `name`, `description`, `price` (entero, ARS), `section` (`desayunos|tortas|dulces`), `motive` (texto nullable), `image_path`, `status` (`active|unavailable|hidden`), `sort_order`, timestamps.
2. Tabla `orders`: `id` (número visible secuencial), `customer_name`, `customer_phone`, `delivery_type` (`domicilio|retiro`), `address` (nullable), `delivery_date`, `delivery_slot`, `notes`, `total`, `status` (`pendiente|confirmado|entregado|cancelado`), `created_at`, `confirmed_at`.
3. Tabla `order_items`: `order_id`, `product_id`, `product_name` (snapshot), `unit_price` (snapshot), `qty`.
4. Tabla/claim de admins (p. ej. `admin_users` con `user_id` de Supabase Auth, o `app_metadata.role='admin'`).
5. RLS: lectura pública solo de productos `active`/`unavailable`; `orders`/`order_items` sin acceso anónimo (escritura solo vía servidor con service role); CRUD de productos y lectura/edición de pedidos solo para admin.
6. Bucket de Storage `product-images` (lectura pública, escritura solo admin).
7. Script de seed con los productos de la referencia y creación del usuario admin (documentado, sin credenciales en el repo).
**Relevant Context:** Datos semilla en [`resources/index/index.html`](resources/index/index.html) líneas 273–285 (`PRODUCTS`).
**Status:** `[ ] pending`

### 3. Tienda pública: catálogo y carrito
**Intent:** Replicar la página de referencia (hero, pasos, secciones, chips por motivo, tarjetas, banda, footer) con productos leídos de la base.
**Expected Outcomes:** `/` muestra Desayunos, Tortas y Dulces desde Supabase; filtros por motivo; productos `unavailable` visibles pero sin botón de agregar; productos `hidden` no aparecen; agregar/quitar al carrito con contador en el header.
**Todo List:**
1. Componentes: `Header`, `Hero`, `Steps`, `ProductSection` (con `MotiveChips`), `ProductCard`, `Band`, `Footer`.
2. Carga de productos en Server Component (los chips de motivo se derivan de los datos, como en la referencia).
3. Estado de carrito en cliente (Context o similar) con persistencia en `localStorage`; helpers `fmt` (formato `es-AR`), totales y contadores.
4. Estados de producto: etiqueta "No disponible" y deshabilitar la acción.
5. Accesibilidad de la referencia: `aria-pressed` en chips, `aria-live` en contador, foco visible, `lang="es"`.
6. Imágenes con `next/image` configurando `remotePatterns` para el dominio de Supabase Storage en [`next.config.ts`](next.config.ts).
**Relevant Context:** [`resources/index/index.html`](resources/index/index.html) líneas 168–270 (markup) y 273–332 (render/carrito).
**Status:** `[ ] pending`

### 4. Drawer de carrito y checkout (sin registro)
**Intent:** Flujo de 3 pasos (Carrito → Datos → Confirmado) idéntico a la referencia, creando el pedido real.
**Expected Outcomes:** El cliente ve el carrito con total, completa nombre, WhatsApp, entrega (domicilio/retiro), dirección (solo domicilio), fecha, horario y nota opcional; al confirmar se guarda el pedido y se muestra la pantalla "¡Pedido recibido!" con timeline y resumen.
**Todo List:**
1. Drawer accesible (`role=dialog`, overlay, Escape, restaurar foco) con barra de progreso.
2. Formulario con validación cliente (UX) y **validación servidor** equivalente: nombre ≥2, teléfono ≥8 dígitos normalizado, dirección obligatoria si domicilio, fecha ≥ hoy, horario dentro de la lista fija, nota con límite de longitud, cantidades enteras positivas con tope.
3. Server Action / Route Handler `createOrder`: reconsulta precios y estado de productos en BD, rechaza productos no activos, calcula total, inserta `orders` + `order_items` (snapshot) con service role, devuelve id de pedido.
4. Protección anti-abuso del endpoint público (honeypot y/o límite de tasa por IP) y mensajes de error genéricos.
5. Disparar aviso al admin (sub-tarea 6) sin bloquear la respuesta al cliente (p. ej. `after()` documentado en `03-api-reference/04-functions/after.md`).
6. Vaciar carrito al confirmar; pantalla final con mensaje de "confirmación por WhatsApp en menos de 30 minutos".
**Relevant Context:** [`resources/index/index.html`](resources/index/index.html) líneas 335–424 (drawer y `submitOrder`).
**Status:** `[ ] pending`

### 5. Autenticación del administrador y panel de pedidos
**Intent:** Panel protegido para gestionar pedidos con control del plazo de 30 min.
**Expected Outcomes:** `/admin/login` (email/clave con Supabase Auth); `/admin` solo accesible a admins; lista de pedidos con estado, datos del cliente, ítems, entrega, contador "Quedan X min / Demorado X min", estadísticas (pendientes, confirmados, total del día) y refresco automático.
**Todo List:**
1. Cliente Supabase SSR (cookies) y verificación de sesión + rol admin en servidor; protección de rutas con `proxy` y verificación adicional dentro de cada Server Action/handler (no confiar solo en la ruta).
2. Página de login y logout; cookies seguras (httpOnly, sameSite, secure).
3. Vista de pedidos replicando `.stats`, `.orders`, `.order`, `.pill`, `.timer` de la referencia, filtros por estado.
4. Refresco periódico (polling o Supabase Realtime) del listado.
5. Acciones: cancelar, marcar entregado (la acción Confirmar se cablea en la sub-tarea 6).
**Relevant Context:** [`resources/index/index.html`](resources/index/index.html) líneas 237–250 y 448–471; `node_modules/next/dist/docs/01-app/02-guides/authentication.md`.
**Status:** `[ ] pending`

### 6. Integración WhatsApp Business Cloud API y avisos
**Intent:** Enviar automáticamente la confirmación al cliente al confirmar el pedido y avisar al admin de pedidos nuevos.
**Expected Outcomes:** Al pulsar "Confirmar" el pedido pasa a `confirmado` y el cliente recibe por WhatsApp (plantilla) el detalle de ítems, total, entrega, fecha/horario e instrucciones de pago; el admin recibe aviso por WhatsApp al crearse un pedido; fallos de envío quedan registrados y son reintentables.
**Todo List:**
1. Módulo servidor `whatsapp` con llamada HTTPS a la Graph API, timeout, token por entorno, normalización del teléfono a formato internacional (AR: `549…`, como en `waLink` de la referencia).
2. Definir y documentar las plantillas a aprobar en Meta: `pedido_confirmado` (parámetros: nombre, nº pedido, resumen, total, entrega, fecha/horario, instrucciones de pago) y `pedido_nuevo` para el admin.
3. Server Action `confirmOrder`: verifica rol admin, valida transición de estado, guarda `confirmed_at`, envía plantilla; si falla el envío, registra `whatsapp_status`/error sin datos sensibles y muestra reintento (y enlace `wa.me` de respaldo).
4. Aviso de pedido nuevo al admin por WhatsApp desde `createOrder` (plantilla `pedido_nuevo`).
5. Logs estructurados sin teléfonos completos ni tokens.
**Relevant Context:** `waLink()` en [`resources/index/index.html`](resources/index/index.html) líneas 435–447 (texto del mensaje a reutilizar).
**Status:** `[ ] pending`

### 7. Gestión de productos (admin)
**Intent:** Alta, edición, cambio de estado y baja de productos con todas sus características.
**Expected Outcomes:** `/admin/productos` lista productos (filtrable por sección/estado) y permite crear/editar con imagen, marcar `no disponible`, `ocultar (baja)`, reactivar y reordenar; los cambios se reflejan en la tienda.
**Todo List:**
1. Listado con búsqueda y filtros por sección y estado.
2. Formulario crear/editar: nombre, descripción, precio, sección, motivo (con sugerencias de motivos existentes y creación libre), orden, estado.
3. Subida de imagen a Supabase Storage (validar tipo y tamaño en servidor) y vista previa.
4. Acciones rápidas: alternar `activo/no disponible`, baja lógica (nunca borrar físicamente si tiene pedidos).
5. Revalidación de la caché de la tienda tras cambios (`revalidatePath`/`revalidateTag`).
6. Todas las acciones verifican rol admin en servidor y validan entradas.
**Relevant Context:** `node_modules/next/dist/docs/01-app/01-getting-started/09-revalidating.md`; modelo `products` de la sub-tarea 2.
**Status:** `[ ] pending`

### 8. Verificación, endurecimiento y documentación
**Intent:** Asegurar calidad y operación.
**Expected Outcomes:** `npm run lint` y `npm run build` sin errores; flujo completo probado; README con puesta en marcha.
**Todo List:**
1. Pruebas del flujo end-to-end: navegar → carrito → pedido (domicilio y retiro) → aparece en admin → confirmar → mensaje WhatsApp.
2. Pruebas de seguridad: pedido con producto oculto/no disponible, precio manipulado, cantidades inválidas, acceso a `/admin` sin sesión, RLS (anon no puede leer pedidos).
3. Revisión responsive (breakpoints de la referencia 720/760/860 px) y accesibilidad por teclado.
4. README: variables de entorno, setup de Supabase (migraciones, seed, admin), setup de Meta/plantillas, despliegue.
5. Ejecutar `npm run lint` y `npm run build`.
**Relevant Context:** [`README.md`](README.md), [`eslint.config.mjs`](eslint.config.mjs).
**Status:** `[ ] pending`

---

## Dependencias entre sub-tareas
1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 (la 7 puede hacerse después de la 5; la 6 requiere 4 y 5).

## Datos externos que el usuario debe proveer
- Proyecto Supabase (URL base, publishable key, secret key) y credenciales del admin.
- Cuenta Meta Business / WhatsApp Cloud API (token, phone number id), número del admin y plantillas aprobadas.
- Textos finales: dirección del local, alias/datos de pago, horario de atención.
