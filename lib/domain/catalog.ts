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

/** Fila de `products` tal como la devuelve la base. */
export type ProductRow = {
  id: string;
  name: string;
  description: string;
  price: number;
  section: Section;
  motive: string | null;
  image_url: string | null;
  status: ProductStatus;
  sort_order: number;
};

export const PRODUCT_COLUMNS = "id,name,description,price,section,motive,image_url,status,sort_order";

export function toProduct(p: ProductRow): Product {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    section: p.section,
    motive: p.motive,
    imageUrl: p.image_url,
    status: p.status,
    sortOrder: p.sort_order,
  };
}

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
