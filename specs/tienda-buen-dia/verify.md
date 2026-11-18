# Verificación final (T18)

Fase 4, tarea T18. Recorre los criterios C1–C29 de [`spec.md`](spec.md) con la estrategia de [`plan.md`](plan.md) §5.

Leyenda de la columna **Estado**:
- **OK-auto**: cubierto por pruebas automáticas que pasan (`npm test`).
- **OK-real**: comprobado contra el proyecto Supabase real (`scripts/verify-remote.mjs`) o contra el build de producción (`next start` + `curl`).
- **OK-hist**: comprobado a mano al cerrar la tarea indicada (tareas aprobadas por el usuario).
- **PENDIENTE**: requiere ojo humano en navegador; no se puede automatizar desde esta verificación.

## Resultados de comandos

| Comando | Resultado |
|---|---|
| `npm test` | 16 archivos, **194 pruebas pasan** (incluye `supabase/tests/schema.test.ts` con PGlite) |
| `npm run lint` | sin errores ni warnings |
| `npm run build` | compila y pasa TypeScript; 9 páginas generadas; `/` con revalidate 1 m, `/admin*` parciales; `Proxy` activo |
| `node --env-file=.env.local scripts/verify-remote.mjs` | **17 correctas, 0 fallidas** |
| `grep` de `sb_secret_`, `SUPABASE_SECRET_KEY`, `RESEND_API_KEY` en `.next/static` | **0 resultados**; tampoco aparecen los valores reales de `SUPABASE_SECRET_KEY` ni `RESEND_API_KEY` |
| HTML de `/` (build de producción) | HTTP 200; **0** apariciones de "admin"; 0 de claves; 12 botones "Agregar" (12 productos) |
| `/admin` y `/admin/productos` sin sesión | HTTP 307 → `/admin/login`; el login emite `noindex, nofollow` |

## Criterio → observación

| # | Criterio | Estado | Observación |
|---|---|---|---|
| C1 | Producto activo visible con imagen, nombre, descripción, precio | OK-real | `anon` lee los productos visibles (12 en la base); el HTML de `/` los renderiza (12 botones "Agregar", secciones Desayunos/Tortas/Dulces). Agrupación en `lib/domain/catalog.test.ts`. |
| C2 | No disponible: marcado y sin agregar | OK-auto / OK-hist | `AddControl` renderiza botón `disabled` "No disponible"; `anon` recibe también los `unavailable`. Probado a mano en T7 y T17. Hoy no hay ninguno en la base. |
| C3 | Dado de baja no aparece | OK-real | `verify-remote`: tras pasar "Pan casero" a `hidden`, `anon` no lo ve; luego se restaura. |
| C4 | Filtro por motivo | OK-auto / OK-hist | `lib/domain/catalog.test.ts` (chips y filtrado); manual en T7. |
| C5 | Contador y total al instante | OK-auto / OK-hist | Reductor puro en `lib/domain/cart.test.ts` (17 pruebas); manual en T8. |
| C6 | Carrito vacío no avanza | OK-hist | Sin botón "Finalizar pedido" con carrito vacío (T9). |
| C7 | Total = Σ(precio × qty) + $3.000 / retiro sin envío; mostrado = registrado | OK-auto / OK-real | `pricing.test.ts`; `schema.test.ts`; `verify-remote`: total 89.500 (86.500 + 3.000) y retiro 7.500 sin envío. El servidor recalcula desde la base (`orders.test.ts`). |
| C8 | Topes 20 por producto / 50 total | OK-auto / OK-real | `cart.test.ts`, `order-schema.test.ts`; la RPC rechaza 21 unidades (`verify-remote`). |
| C9 | Un mensaje por unidad (≤150) solo en desayunos y tortas | OK-auto / OK-real | `cart.test.ts`, `order-schema.test.ts`; la RPC rechaza un mensaje en un dulce (`verify-remote`). 3 campos independientes verificados en T9. |
| C10 | Domicilio exige dirección; retiro muestra dirección del local | OK-auto / OK-hist | `order-schema.test.ts`; `schema.test.ts` ("domicilio exige dirección"); flujo en T11. **Nota:** La dirección ahora sale de `NEXT_PUBLIC_STORE_ADDRESS` (`Suipacha 193` en `.env.local`); hay que definirla también en el hosting. |
| C11 | Nombre vacío / fecha pasada / sin horario: no se envía | OK-auto | `order-schema.test.ts` con error por campo. |
| C12 | WhatsApp argentino de 10 dígitos | OK-auto | `phone.test.ts` y `order-schema.test.ts`: `351-3445566` y `385-4332211` válidos; `0351…`, `15…`, `+54…`, 9 y 11 dígitos inválidos. |
| C13 | Anticipación mínima de 12 h | OK-auto | `slots.test.ts`: exactamente 12 h válido, 11 h 59 min inválido, lunes 20:00 → martes 08:00–09:00. La RPC también rechaza < ~12 h (`schema.test.ts`). |
| C14 | Pedido válido: `pendiente`, carrito vacío, id, resumen, medios de pago | OK-hist | Probado a mano en T11 (alias `BUENDIA.DESAYUNOS`, efectivo al retirar, aviso de 30 min). |
| C15 | Sin cuenta ni contraseña para el cliente | OK-hist | No existe ninguna pantalla de registro; el pedido lo crea la secret key en servidor. |
| C16 | Producto no disponible/baja entre carrito y confirmación: rechazo con nombre | OK-auto / OK-real | `orders.test.ts`; `verify-remote` ("producto oculto: devuelve su nombre"); `schema.test.ts`. |
| C17 | Correo a los admins con `wa.me`; si falla, el pedido se conserva | OK-auto / OK-hist | `email.test.ts` (éxito, error HTTP, timeout, sin admins, sin configuración), `messages.test.ts` (enlace `wa.me`, escape de HTML), `orders.test.ts` (`after()`). Envío real con Resend probado en T13. |
| C18 | Solo admin autenticado accede; los demás no ven pedidos | OK-real | `anon`: HTTP 401 al leer `orders` y `order_items` (`verify-remote`); `/admin*` sin sesión redirige al login; `schema.test.ts` confirma que `user_metadata.role=admin` no otorga permisos; `verifyAdmin()` exige `app_metadata.role`. |
| C19 | La tienda pública no revela el panel | OK-real | HTML de `/` con **0** apariciones de "admin"; ningún componente de `store/` ni `cart/` enlaza a `/admin`; `/admin/login` con `noindex`. Las únicas referencias "admin" en `.next/static` están en chunks de rutas `/admin*` y en CSS (`.admin`), no cargados por `/`. |
| C20 | El panel muestra todos los campos del pedido | OK-hist | Verificado en T15 con pedidos de prueba, incluidos mensajes por unidad. |
| C21 | Confirmar → `confirmado`, sin mensajes | OK-auto / OK-hist | `admin-orders.test.ts` (transición atómica, doble clic aplica una sola vez); T16. |
| C22 | Cancelar → `cancelado`, sin mensajes | OK-auto / OK-hist | Ídem. |
| C23 | *(Descartado)* | n/a | Reintento de WhatsApp automático, eliminado (T12 descartada). |
| C24 | Confirmado → entregado | OK-auto / OK-hist | `admin-orders.test.ts`: entregar un `pendiente` y cancelar un `confirmado` son rechazados. |
| C25 | 30 min sin confirmar: el panel marca demora, sin recordatorio | OK-auto / OK-hist | `orders.test.ts` ("Quedan X min para confirmar" → "Demorado X min"); lista refrescada cada 30 s (`REFRESH_MS`). No existe ningún envío al cliente. |
| C26 | Crear producto con imagen y verlo en la tienda | OK-auto / OK-hist | `admin-products.test.ts` (`updateTag('products')`, validación de imagen); T17. |
| C27 | Cambiar precio no altera pedidos viejos | OK-auto | `schema.test.ts` ("cambiar el precio no altera pedidos viejos"); `order_items` guarda nombre y precio. |
| C28 | Dar de baja no altera pedidos anteriores | OK-auto | `schema.test.ts` (productos con pedidos no se borran: `on delete restrict`); el panel abre pedidos con productos `hidden`. |
| C29 | Mismo aspecto que la referencia y responsive | **PENDIENTE** | Verificación visual a 360, 768 y 1280 px. T2 y T7 se aprobaron visualmente; `globals.css` incluye `@media` para ≤720, ≤760 y ≤860 px. Falta una pasada final en navegador. |

## Revisiones adicionales de T18

| Revisión | Estado | Observación |
|---|---|---|
| Teclado: drawer accesible | OK (código) / PENDIENTE (navegador) | `CartDrawer` tiene `role="dialog"`, `aria-modal="true"`, cierre con `Escape`, foco al abrir y restitución del foco al cerrar. Falta recorrerlo con Tab en navegador. |
| Responsive | PENDIENTE | Ver C29. |
| Secretos fuera del bundle | OK-real | Ver tabla de comandos (0 resultados). |
| `.env.local` ignorado y `.env.example` versionado | OK | `.gitignore` contiene `.env*` y `!.env.example`. |
| `README` completo | OK | Variables, Supabase, admin, Resend y despliegue. |

## Hallazgos y desvíos

1. **`scripts/verify-remote.mjs` estaba desactualizado** frente a la base real: esperaba exactamente 11 productos y 0 pedidos al final. La base real tiene 12 productos (se agregó "Torta Clásica de Frutillas y Dulce de Leche" desde el panel en T17) y 17 pedidos de prueba. Se ajustó el script para exigir ≥ 11 productos sin ninguno `hidden` y comprobar que los pedidos existentes quedan intactos. Resultado: 17/17.
2. **Título de la página**: `tasks.md` T2 decía "Buen Día — Desayunos, Tortas y Dulces"; `app/layout.tsx` usa "Dulce Despertar — Desayunos, Tortas y Dulces". Se asume decisión posterior de marca (el alias de pago sigue siendo `BUENDIA.DESAYUNOS`). Sin impacto funcional.
3. **Dirección del local**: pasó a la variable `NEXT_PUBLIC_STORE_ADDRESS` (fija en build). Definirla en el hosting; si falta se muestra un texto provisional.
4. **Aviso de build**: Next.js informa que ignoró un `package-lock.json` en `/Users/andresherrera` por estar fuera del repositorio. No afecta al build; se evita con `turbopack.root` en `next.config.ts`.

## Conclusión

Sin fallos en lo verificable de forma automática o contra servicios reales: `npm test` (194), `npm run lint` y `npm run build` limpios, 0 secretos en el bundle, 0 menciones de "admin" en el HTML público y permisos de base de datos correctos.

Quedan **solo dos comprobaciones humanas**: la pasada visual de C29 (360 / 768 / 1280 px) y recorrer el drawer con teclado.
