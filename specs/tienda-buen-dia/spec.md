# Spec: Tienda online "Buen Día"

Fase 1 (SPECIFY) + fase 2 (CLARIFY, resuelta). Describe qué y por qué, no cómo.
Referencia visual: `resources/index/index.html` (la página debe verse igual).
El plan técnico previo (`dulce-despertar-plan.md`) es insumo de la fase PLAN y se revisará contra esta spec.

## Goal

Que un cliente pueda armar y enviar un pedido de cajas de desayuno, tortas y dulces sin registrarse, y que el administrador lo confirme en menos de 30 minutos y le envíe el detalle por WhatsApp para pagar.

## Actores

- **Cliente**: visitante anónimo. Solo informa nombre y número de WhatsApp.
- **Administrador**: uno o más usuarios con el mismo permiso total. Su acceso no es visible para el cliente.

## Reglas de negocio

- **Anticipación**: todo pedido (desayunos, tortas y dulces) requiere como mínimo 12 horas entre el momento de hacerlo y la fecha y hora de entrega solicitadas.
- **Horarios de entrega** (iguales para domicilio y retiro, todos los días): 07:00–08:00, 08:00–09:00, 09:00–10:00, 10:00–11:00, 11:00–12:00, 16:00–17:00, 17:00–18:00, 18:00–19:00.
- **Envío a domicilio**: costo fijo de $3.000 ARS. Retiro en local: sin costo.
- **Medios de pago**: efectivo al retirar o transferencia al alias (ficticio por ahora: `BUENDIA.DESAYUNOS`) por el monto total del pedido.
- **Teléfono**: solo números de Argentina, con característica y número (ej. `351-3445566`, `385-4332211`).
- **Cantidades máximas**: 20 unidades por producto y 50 en total por pedido.
- **Personalización**: opcional, mensaje por cada caja (ver F2).
- **Datos de clientes**: sin política de borrado.

## Flujos

### F1. Cliente: explorar y armar carrito
1. Entra a la página y ve tres secciones: Cajas de desayuno, Tortas, Dulces y panificados.
2. Desayunos y tortas se pueden filtrar por motivo (cumpleaños, aniversario, día del niño, día del padre, infantil, otros motivos).
3. Agrega y quita productos, cambia cantidades, ve el contador del carrito.

### F2. Cliente: finalizar pedido
1. Abre el carrito: ve productos, cantidades, subtotal, costo de envío y total.
2. Para cada caja de desayuno y cada torta puede elegir "Agregar mensaje personalizado" y escribir un mensaje distinto por cada unidad. Los dulces no se personalizan.
3. Ingresa nombre, número de WhatsApp, forma de entrega (a domicilio o retiro en local), dirección (solo si es a domicilio), fecha, horario estimado y una nota general opcional.
4. Confirma. Ve una pantalla con número de pedido, resumen, medios de pago y el aviso de que recibirá confirmación por WhatsApp en menos de 30 minutos.

### F3. Administrador: confirmar o rechazar pedido
1. Es avisado por WhatsApp de cada pedido nuevo.
2. Ingresa al panel, ve pedidos con estado y tiempo restante de los 30 minutos.
3. Evalúa si llega con la fecha y hora solicitadas. Si llega, lo confirma y el cliente recibe por WhatsApp el detalle y cómo pagar.
4. Si no llega, lo cancela y el cliente recibe por WhatsApp un mensaje de disculpas por no poder cumplir con su pedido.
5. Un pedido confirmado puede marcarse luego como entregado.

### F4. Administrador: gestionar productos
1. Da de alta un producto con nombre, descripción, precio, sección, motivo e imagen.
2. Edita cualquier dato.
3. Lo marca **no disponible** (se ve pero no se puede pedir) o lo da de **baja** (deja de mostrarse).
4. Reactiva productos.

## Criterios de aceptación

**Catálogo**
1. Dado un producto activo, cuando el cliente entra a la página, entonces lo ve en su sección con imagen, nombre, descripción y precio.
2. Dado un producto no disponible, entonces se ve marcado como no disponible y no puede agregarse al carrito.
3. Dado un producto dado de baja, entonces no aparece en la página.
4. Dado el filtro de motivo en desayunos o tortas, cuando el cliente elige un motivo, entonces solo ve productos de ese motivo.

**Carrito**
5. Cuando el cliente agrega, quita o cambia cantidades, entonces el contador y el total se actualizan al instante.
6. Dado un carrito vacío, entonces no puede avanzar a los datos de entrega.
7. Dado un pedido a domicilio, entonces el total = suma de (precio vigente × cantidad) + $3.000; dado un retiro en local, entonces el total = suma de (precio vigente × cantidad). El total mostrado y el registrado son iguales.
8. Dado un producto con 20 unidades en el carrito, o 50 unidades en total, entonces no se pueden agregar más.
9. Dada una caja de desayuno o una torta con 3 unidades, cuando el cliente activa la personalización, entonces puede escribir un mensaje distinto para cada una de las 3 unidades (hasta 150 caracteres cada uno). Los dulces no ofrecen personalización.

**Pedido**
10. Dado un pedido a domicilio, entonces la dirección es obligatoria; dado un retiro en local, no se pide dirección y se muestra la dirección del local.
11. Dados nombre vacío, fecha pasada u horario no elegido, entonces el pedido no se envía y se indica qué corregir.
12. Dado un WhatsApp que no sea un número argentino de 10 dígitos (característica + número, con o sin guiones o espacios, ej. `351-3445566`), entonces el pedido no se envía y se indica el formato esperado.
13. Dada una fecha y horario cuyo inicio sea menos de 12 horas posterior al momento actual, entonces ese horario no se puede elegir y se indica la anticipación mínima. Ejemplo: a las 20:00 del lunes, el primer horario elegible es 08:00–09:00 del martes.
14. Cuando el cliente confirma un pedido válido, entonces el pedido queda registrado como pendiente, el carrito se vacía y el cliente ve su número de pedido, el resumen y los medios de pago.
15. El cliente nunca necesita crear cuenta ni contraseña.
16. Si entre armar el carrito y confirmar un producto pasó a no disponible o baja, entonces el pedido se rechaza indicando qué producto quitar.
17. Cuando entra un pedido nuevo, entonces el administrador recibe un aviso por WhatsApp.

**Administración de pedidos**
18. Solo un administrador autenticado accede al panel; cualquier otra persona no ve pedidos ni datos de clientes.
19. La página pública no muestra enlaces, botones ni textos que revelen la existencia del panel de administración.
20. El panel muestra para cada pedido: cliente, WhatsApp, ítems con sus mensajes personalizados, envío, total, forma de entrega, dirección, fecha, horario, nota, estado y tiempo restante o demora respecto de los 30 minutos.
21. Cuando el administrador confirma un pedido, entonces el estado pasa a confirmado y el cliente recibe por WhatsApp el detalle (ítems, total, entrega, fecha y horario) y cómo pagar (efectivo al retirar o transferencia al alias).
22. Cuando el administrador cancela un pedido, entonces el estado pasa a cancelado y el cliente recibe por WhatsApp un mensaje de disculpas por no llegar con su pedido.
23. Si el envío de un WhatsApp (confirmación o cancelación) falla, entonces el administrador lo ve y puede reintentar; el pedido no se pierde.
24. El administrador puede marcar un pedido confirmado como entregado.
25. Si pasan 30 minutos sin confirmar, el cliente no ve ningún cambio y el panel marca la demora; no se envía ningún recordatorio adicional.

**Administración de productos**
26. El administrador puede crear un producto con todos sus datos e imagen y verlo en la página.
27. Cuando cambia el precio de un producto, los pedidos ya registrados conservan el precio y nombre que tenían.
28. Dar de baja un producto no altera los pedidos anteriores que lo incluían.

**Diseño**
29. La página y el carrito tienen el mismo aspecto (colores, tipografía, estructura) que la referencia y funcionan en celular. El botón "Panel administrador (demo)" del pie de la referencia no se incluye (ver criterio 19).

## Fuera de alcance

- Registro, login o historial de clientes.
- Pago en línea dentro de la página (el pago se coordina por WhatsApp).
- Seguimiento del estado del pedido por parte del cliente en la web.
- Control de stock por cantidad.
- Horarios, datos del local, costo de envío y alias de pago editables desde el panel (son fijos).
- Zonas de cobertura o costo de envío variable.
- Roles de administrador con permisos limitados.
- Política de borrado de datos de clientes.
- Recordatorios al administrador por demora.
- Múltiples sucursales, idiomas o teléfonos de otros países.

## Decisiones ya tomadas

- Un solo sitio con base de datos hospedada (Supabase); el administrador entra con email y clave.
- Confirmación, cancelación al cliente y aviso al administrador: automáticos por WhatsApp; sin email.
- Estados de pedido: pendiente → confirmado → entregado, o pendiente → cancelado.
- Estados de producto: activo / no disponible / baja.

## Interpretaciones a confirmar al aprobar

- Del punto 5, entendí "efectivo o transferencia por alias al monto de retirar" como: efectivo al retirar o transferencia al alias por el monto total del pedido.
- Del punto 7, apliqué la personalización solo a cajas de desayuno y tortas, con un mensaje por unidad y un máximo de 150 caracteres.
- Del punto 9, acepté solo 10 dígitos (característica sin 0 + número sin 15), con o sin guiones o espacios.
- Del punto 1, la anticipación se mide contra el inicio de la franja horaria elegida.

## Gate

Pendiente: aprobación de esta spec. Luego se genera `plan.md` (revisando `dulce-despertar-plan.md` contra los criterios) y `tasks.md`.
