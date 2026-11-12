import type { Section } from "../config";

/** Producto tal como lo usa la tienda (la base devuelve snake_case; se mapea en lib/catalog.ts). */
export type ProductStatus = "active" | "unavailable" | "hidden";

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  section: Section;
  motive: string | null;
  imageUrl: string | null;
  status: ProductStatus;
  sortOrder: number;
};

/** Motivos distintos, en el orden en que aparecen (los chips de filtro se derivan de los datos). */
export function motivesOf(products: readonly Product[]): string[] {
  const seen = new Set<string>();
  for (const { motive } of products) {
    if (motive) seen.add(motive);
  }
  return [...seen];
}

export function groupBySection(products: readonly Product[]): Record<Section, Product[]> {
  const out: Record<Section, Product[]> = { desayunos: [], tortas: [], dulces: [] };
  for (const product of products) out[product.section].push(product);
  return out;
}
