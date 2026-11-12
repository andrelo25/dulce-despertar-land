import { z } from "zod";
import {
  MAX_PER_PRODUCT,
  MAX_TOTAL,
  MESSAGE_MAX,
  MIN_LEAD_HOURS,
  NOTE_MAX,
  PERSONALIZABLE_SECTIONS,
  SLOTS,
  type Section,
  type Slot,
} from "../config";
import { formatDateLabel, formatSlotLabel } from "./messages";
import { isValidPhone, normalizePhone } from "./phone";
import type { DeliveryType } from "./pricing";
import { artDateString, firstAvailableSlot, isSlotAllowed, isValidDateString } from "./slots";

/**
 * Validación del pedido en el servidor (plan §4.4). Es la única barrera real: la validación del
 * formulario en el navegador es solo ayuda de UX. Los precios NO viajan en el pedido.
 */

const NAME_MIN = 2;
const NAME_MAX = 80;
const ADDRESS_MIN = 5;
const ADDRESS_MAX = 200;

export type CartLine = { productId: string; qty: number; messages: string[] };

export type OrderInput = {
  cart: CartLine[];
  name: string;
  phone: string; // 10 dígitos
  deliveryType: DeliveryType;
  address: string | null;
  date: string; // AAAA-MM-DD
  slot: Slot;
  note: string | null;
};

/** Errores por campo, listos para mostrar. La clave `form` agrupa errores sin campo. */
export type FieldErrors = Partial<Record<string, string[]>>;

export type ParseResult = { ok: true; data: OrderInput } | { ok: false; fieldErrors: FieldErrors };

const lineSchema = z
  .object({
    productId: z.uuid({ error: "Hay un producto inválido en el carrito." }),
    qty: z
      .number({ error: "La cantidad debe ser un número." })
      .int("La cantidad debe ser un número entero.")
      .min(1, "La cantidad mínima es 1.")
      .max(MAX_PER_PRODUCT, `Máximo ${MAX_PER_PRODUCT} unidades por producto.`),
    messages: z
      .array(
        z
          .string({ error: "Mensaje inválido." })
          .trim()
          .max(MESSAGE_MAX, `Cada mensaje puede tener hasta ${MESSAGE_MAX} caracteres.`),
        { error: "Mensajes inválidos." },
      )
      .nullish(),
  })
  .superRefine((line, ctx) => {
    if ((line.messages?.length ?? 0) > line.qty) {
      ctx.addIssue({ code: "custom", message: "Hay más mensajes personalizados que unidades." });
    }
  })
  .transform((line): CartLine => {
    const messages = line.messages ?? [];
    // Si ninguna unidad tiene texto, no hay personalización.
    return {
      productId: line.productId,
      qty: line.qty,
      messages: messages.some((m) => m !== "") ? messages : [],
    };
  });

const cartSchema = z
  .array(lineSchema, { error: "Tu carrito está vacío." })
  .min(1, "Tu carrito está vacío.")
  .superRefine((cart, ctx) => {
    const ids = cart.map((l) => l.productId);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: "custom", message: "Hay productos repetidos en el carrito." });
    }
    const units = cart.reduce((acc, l) => acc + l.qty, 0);
    if (units > MAX_TOTAL) {
      ctx.addIssue({ code: "custom", message: `Máximo ${MAX_TOTAL} unidades por pedido.` });
    }
  });

/** Se construye por llamada porque la regla de anticipación depende de la hora actual. */
const makeOrderSchema = (now: Date) =>
  z
    .object({
      cart: cartSchema,
      name: z
        .string({ error: "Ingresá tu nombre." })
        .trim()
        .min(NAME_MIN, "Ingresá tu nombre.")
        .max(NAME_MAX, `El nombre puede tener hasta ${NAME_MAX} caracteres.`),
      phone: z
        .string({ error: "Ingresá tu WhatsApp." })
        .refine(isValidPhone, "Ingresá un celular argentino de 10 dígitos, sin 0 ni 15 (ej. 351-3445566).")
        .transform((v) => normalizePhone(v) ?? v),
      deliveryType: z.enum(["domicilio", "retiro"], { error: "Elegí cómo querés recibir tu pedido." }),
      address: z.string({ error: "Dirección inválida." }).nullish(),
      date: z.string({ error: "Elegí una fecha de entrega." }),
      slot: z.string({ error: "Elegí un horario de entrega." }),
      note: z
        .string({ error: "Nota inválida." })
        .trim()
        .max(NOTE_MAX, `La nota puede tener hasta ${NOTE_MAX} caracteres.`)
        .nullish()
        .transform((v) => v || null),
      website: z.unknown().optional(), // honeypot (en zod 4, unknown ya no es opcional por defecto)
    })
    .superRefine((o, ctx) => {
      if (o.website !== undefined && o.website !== null && o.website !== "") {
        ctx.addIssue({ code: "custom", path: ["website"], message: "Solicitud rechazada." });
      }

      if (o.deliveryType === "domicilio") {
        const address = (o.address ?? "").trim();
        if (address.length < ADDRESS_MIN) {
          ctx.addIssue({ code: "custom", path: ["address"], message: "Ingresá la dirección de entrega." });
        } else if (address.length > ADDRESS_MAX) {
          ctx.addIssue({
            code: "custom",
            path: ["address"],
            message: `La dirección puede tener hasta ${ADDRESS_MAX} caracteres.`,
          });
        }
      }

      // Fecha y horario se evalúan por separado para poder mostrar ambos errores a la vez.
      const dateOk = isValidDateString(o.date);
      const slotOk = (SLOTS as readonly string[]).includes(o.slot);
      const notPast = dateOk && o.date >= artDateString(now);

      if (!dateOk) {
        ctx.addIssue({ code: "custom", path: ["date"], message: "Elegí una fecha de entrega válida." });
      } else if (!notPast) {
        ctx.addIssue({ code: "custom", path: ["date"], message: "La fecha no puede ser anterior a hoy." });
      }
      if (!slotOk) {
        ctx.addIssue({ code: "custom", path: ["slot"], message: "Elegí un horario de entrega." });
      } else if (dateOk && notPast && !isSlotAllowed(o.date, o.slot, now)) {
        const first = firstAvailableSlot(now);
        ctx.addIssue({
          code: "custom",
          path: ["slot"],
          message:
            `Necesitamos al menos ${MIN_LEAD_HOURS} h de anticipación. ` +
            `El primer horario disponible es el ${formatDateLabel(first.date)}, ${formatSlotLabel(first.slot)}.`,
        });
      }
    });

function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = typeof issue.path[0] === "string" ? issue.path[0] : "form";
    const list = (out[key] ??= []);
    if (!list.includes(issue.message)) list.push(issue.message);
  }
  return out;
}

export function parseOrderInput(raw: unknown, now: Date): ParseResult {
  const parsed = makeOrderSchema(now).safeParse(raw);
  if (!parsed.success) return { ok: false, fieldErrors: toFieldErrors(parsed.error) };

  const v = parsed.data;
  return {
    ok: true,
    data: {
      cart: v.cart,
      name: v.name,
      phone: v.phone,
      deliveryType: v.deliveryType,
      address: v.deliveryType === "domicilio" ? (v.address ?? "").trim() : null,
      date: v.date,
      slot: v.slot as Slot,
      note: v.note,
    },
  };
}

/* ---------- Reglas que dependen del catálogo (se aplican con los datos de la base) ---------- */

export type CatalogEntry = { name: string; section: Section; status: "active" | "unavailable" | "hidden" };

export type CatalogCheck =
  | { ok: true }
  | { ok: false; fieldErrors: FieldErrors; unavailable: string[] };

/**
 * Comprueba el carrito contra los productos reales: existencia, estado (C16) y que solo se
 * personalicen desayunos y tortas (C9). Los dulces nunca llevan mensaje.
 */
export function checkCartAgainstCatalog(
  cart: readonly CartLine[],
  catalog: ReadonlyMap<string, CatalogEntry>,
): CatalogCheck {
  const errors: string[] = [];
  const unavailable: string[] = [];
  let missing = false;

  for (const line of cart) {
    const entry = catalog.get(line.productId);
    if (!entry) {
      missing = true;
      continue;
    }
    if (entry.status !== "active") {
      unavailable.push(entry.name);
      continue;
    }
    const personalized = line.messages.some((m) => m.trim() !== "");
    if (personalized && !PERSONALIZABLE_SECTIONS.includes(entry.section)) {
      errors.push(`"${entry.name}" no admite mensaje personalizado.`);
    }
  }

  if (unavailable.length > 0) {
    errors.push(`Ya no están disponibles: ${unavailable.join(", ")}. Quitalos del carrito para continuar.`);
  }
  if (missing) {
    errors.push("Hay productos que ya no existen. Actualizá tu carrito.");
  }

  if (errors.length === 0) return { ok: true };
  return { ok: false, fieldErrors: { cart: errors }, unavailable };
}
