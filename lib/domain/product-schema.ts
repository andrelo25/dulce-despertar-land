import { z } from "zod";
import { PRODUCT_IMAGE_MAX_BYTES, SECTIONS, type Section } from "../config";
import type { ProductStatus } from "./catalog";

/**
 * Validación en el servidor de los datos de producto que carga el admin (T17) y de la imagen subida.
 * Los límites coinciden con los `check` de la tabla `products` (migración 0001).
 */

const NAME_MIN = 2;
const NAME_MAX = 120;
const DESCRIPTION_MAX = 500;
const MOTIVE_MAX = 40;
const PRICE_MAX = 10_000_000;
const SORT_MAX = 9999;

export const PRODUCT_STATUSES = ["active", "unavailable", "hidden"] as const;

/** Solo desayunos y tortas se filtran por motivo (spec); los dulces nunca llevan. */
const MOTIVE_SECTIONS: readonly Section[] = ["desayunos", "tortas"];

export type ProductInput = {
  name: string;
  description: string;
  price: number;
  section: Section;
  motive: string | null;
  status: ProductStatus;
  sortOrder: number;
};

export type ProductFieldErrors = Partial<Record<string, string[]>>;

export type ProductParseResult =
  | { ok: true; data: ProductInput }
  | { ok: false; fieldErrors: ProductFieldErrors };

const productSchema = z.object({
  name: z
    .string({ error: "Ingresá el nombre." })
    .trim()
    .min(NAME_MIN, `El nombre debe tener al menos ${NAME_MIN} caracteres.`)
    .max(NAME_MAX, `El nombre puede tener hasta ${NAME_MAX} caracteres.`),
  description: z
    .string({ error: "Descripción inválida." })
    .trim()
    .max(DESCRIPTION_MAX, `La descripción puede tener hasta ${DESCRIPTION_MAX} caracteres.`),
  price: z
    .string({ error: "Ingresá el precio." })
    .trim()
    .refine((v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= PRICE_MAX, "El precio debe ser un entero mayor a 0.")
    .transform(Number),
  section: z.enum(SECTIONS, { error: "Elegí una sección." }),
  motive: z
    .string({ error: "Motivo inválido." })
    .trim()
    .max(MOTIVE_MAX, `El motivo puede tener hasta ${MOTIVE_MAX} caracteres.`)
    .nullish(),
  status: z.enum(PRODUCT_STATUSES, { error: "Elegí un estado." }),
  sortOrder: z
    .string({ error: "Ingresá el orden." })
    .trim()
    .refine((v) => /^\d+$/.test(v) && Number(v) <= SORT_MAX, `El orden debe ser un entero entre 0 y ${SORT_MAX}.`)
    .transform(Number),
});

export function parseProductInput(raw: unknown): ProductParseResult {
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = typeof issue.path[0] === "string" ? issue.path[0] : "form";
      const list = (fieldErrors[key] ??= []);
      if (!list.includes(issue.message)) list.push(issue.message);
    }
    return { ok: false, fieldErrors };
  }

  const v = parsed.data;
  return {
    ok: true,
    data: {
      name: v.name,
      description: v.description,
      price: v.price,
      section: v.section,
      motive: MOTIVE_SECTIONS.includes(v.section) && v.motive ? v.motive : null,
      status: v.status,
      sortOrder: v.sortOrder,
    },
  };
}

/* ---------- Imagen ---------- */

export type ImageCheck =
  | { ok: true; contentType: "image/jpeg" | "image/png" | "image/webp"; ext: "jpg" | "png" | "webp" }
  | { ok: false; error: string };

const startsWith = (bytes: Uint8Array, signature: readonly number[], offset = 0) =>
  signature.every((b, i) => bytes[offset + i] === b);

/**
 * Valida tamaño y tipo real (por firma de bytes, no por el nombre ni el MIME que declara el cliente).
 * `head` alcanza con los primeros 12 bytes del archivo.
 */
export function checkImage(size: number, head: Uint8Array): ImageCheck {
  if (size > PRODUCT_IMAGE_MAX_BYTES) return { ok: false, error: "La imagen no puede superar 2 MB." };

  if (startsWith(head, [0xff, 0xd8, 0xff])) return { ok: true, contentType: "image/jpeg", ext: "jpg" };
  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { ok: true, contentType: "image/png", ext: "png" };
  }
  // WEBP: "RIFF" .... "WEBP"
  if (startsWith(head, [0x52, 0x49, 0x46, 0x46]) && startsWith(head, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { ok: true, contentType: "image/webp", ext: "webp" };
  }
  return { ok: false, error: "El archivo debe ser una imagen JPG, PNG o WEBP." };
}
