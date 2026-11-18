import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkImage } from "./domain/product-schema";

const BUCKET = "product-images";

export type UploadResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Sube una imagen al bucket público `product-images` con la sesión del admin (RLS de storage).
 * Valida tamaño y tipo real en el servidor; el nombre del archivo lo genera el servidor (nunca el cliente).
 */
export async function uploadProductImage(supabase: SupabaseClient, file: File): Promise<UploadResult> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const check = checkImage(file.size, head);
  if (!check.ok) return check;

  const path = `${crypto.randomUUID()}.${check.ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: check.contentType, cacheControl: "31536000", upsert: false });
  if (error) {
    console.error("product image upload failed", { name: error.name });
    return { ok: false, error: "No se pudo subir la imagen." };
  }
  return { ok: true, url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
}
