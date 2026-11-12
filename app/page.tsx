import { getCatalog } from "@/lib/catalog";

// Listado TEMPORAL de T6 para verificar el catálogo. T7 lo reemplaza.
export default async function Home() {
  const products = await getCatalog();
  return (
    <main className="wrap">
      <ul>
        {products.map((p) => (
          <li key={p.id}>
            {p.section} · {p.name} · ${p.price} · {p.status}
          </li>
        ))}
      </ul>
    </main>
  );
}
