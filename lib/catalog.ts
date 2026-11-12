import { cacheLife, cacheTag } from "next/cache";
import type { Product } from "./domain/catalog";
import { createPublishableClient } from "./supabase/publishable";

/** Productos visibles (activos y no disponibles); RLS oculta los `hidden`. */
export async function getCatalog(): Promise<Product[]> {
  "use cache";
  cacheTag("products");
  cacheLife("minutes");

  const { data, error } = await createPublishableClient()
    .from("products")
    .select("id,name,description,price,section,motive,image_url,status,sort_order")
    .neq("status", "hidden")
    .order("sort_order");
  if (error) throw new Error("catalog_unavailable");

  return data.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    section: p.section,
    motive: p.motive,
    imageUrl: p.image_url,
    status: p.status,
    sortOrder: p.sort_order,
  }));
}
