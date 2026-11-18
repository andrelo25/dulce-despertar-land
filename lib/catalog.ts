import { cacheLife, cacheTag } from "next/cache";
import { PRODUCT_COLUMNS, toProduct, type Product } from "./domain/catalog";
import { createPublishableClient } from "./supabase/publishable";

/** Productos visibles (activos y no disponibles); RLS oculta los `hidden`. */
export async function getCatalog(): Promise<Product[]> {
  "use cache";
  cacheTag("products");
  cacheLife("minutes");

  const { data, error } = await createPublishableClient()
    .from("products")
    .select(PRODUCT_COLUMNS)
    .neq("status", "hidden")
    .order("sort_order");
  if (error) throw new Error("catalog_unavailable");

  return data.map(toProduct);
}
