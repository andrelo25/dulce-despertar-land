"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { verifyAdmin } from "../dal";
import { parseProductInput, PRODUCT_STATUSES, type ProductFieldErrors } from "../domain/product-schema";
import type { ProductStatus } from "../domain/catalog";
import { uploadProductImage } from "../product-images";
import { createClient } from "../supabase/server";

export type SaveProductResult = {
  fieldErrors: ProductFieldErrors;
  /** Valores enviados, para no perder lo escrito cuando hay errores. */
  values: Record<string, string>;
} | null;

export type StatusResult = { ok: true } | { ok: false; error: string };

const TEXT_FIELDS = ["name", "description", "price", "section", "motive", "status", "sortOrder"] as const;

function afterChange() {
  updateTag("products"); // la tienda pública refleja el cambio de inmediato (C26)
  revalidatePath("/admin/productos");
}

/** Alta (sin `id`) o edición (con `id`). Todo se valida en el servidor; la imagen es opcional. */
export async function saveProduct(_prev: SaveProductResult, formData: FormData): Promise<SaveProductResult> {
  await verifyAdmin();

  const idRaw = formData.get("id");
  const id = typeof idRaw === "string" && idRaw !== "" ? idRaw : null;
  if (id !== null && !z.uuid().safeParse(id).success) {
    return { fieldErrors: { form: ["Producto inválido."] }, values: {} };
  }

  const raw: Record<string, unknown> = {};
  const values: Record<string, string> = {};
  for (const key of TEXT_FIELDS) {
    const v = formData.get(key);
    raw[key] = v;
    if (typeof v === "string") values[key] = v;
  }

  const parsed = parseProductInput(raw);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, values };

  const supabase = await createClient();

  let imageUrl: string | undefined;
  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    const uploaded = await uploadProductImage(supabase, image);
    if (!uploaded.ok) return { fieldErrors: { image: [uploaded.error] }, values };
    imageUrl = uploaded.url;
  }

  const d = parsed.data;
  const row = {
    name: d.name,
    description: d.description,
    price: d.price,
    section: d.section,
    motive: d.motive,
    status: d.status,
    sort_order: d.sortOrder,
    ...(imageUrl ? { image_url: imageUrl } : {}),
  };

  const { data, error } = id
    ? await supabase.from("products").update(row).eq("id", id).select("id")
    : await supabase.from("products").insert(row).select("id");

  if (error || !data || data.length === 0) {
    console.error("product save failed", { code: error?.code });
    return { fieldErrors: { form: ["No se pudo guardar el producto."] }, values };
  }

  afterChange();
  redirect("/admin/productos");
}

/** Cambia el estado: `active`, `unavailable` (visible sin botón) u `hidden` (baja; nunca se borra). */
export async function setProductStatus(id: string, status: ProductStatus): Promise<StatusResult> {
  await verifyAdmin();
  if (!z.uuid().safeParse(id).success || !(PRODUCT_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: "Solicitud inválida." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("products").update({ status }).eq("id", id).select("id");
  if (error || data.length === 0) {
    console.error("product status failed", { code: error?.code });
    return { ok: false, error: "No se pudo cambiar el estado." };
  }

  afterChange();
  return { ok: true };
}
