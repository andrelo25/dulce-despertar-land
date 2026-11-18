"use client";

import { useState } from "react";
import type { Product } from "@/lib/domain/catalog";
import { motivesOf } from "@/lib/domain/catalog";
import { ProductCard } from "./ProductCard";

type Props = {
  id: string;
  title: string;
  subtitle: string;
  products: Product[];
  /** Muestra chips de filtro por motivo (desayunos y tortas). */
  filterable?: boolean;
  filterLabel?: string;
};

const ALL = "Todos";

export function ProductSection({ id, title, subtitle, products, filterable, filterLabel }: Props) {
  const [motive, setMotive] = useState(ALL);
  const motives = filterable ? [ALL, ...motivesOf(products)] : [];
  const visible = motive === ALL ? products : products.filter((p) => p.motive === motive);

  return (
    <section className="cat" id={id} aria-labelledby={`h-${id}`}>
      <div className="sec-head">
        <div>
          <h2 id={`h-${id}`}>{title}</h2>
          <p>{subtitle}</p>
        </div>
        {motives.length > 1 && (
          <div className="chips" role="group" aria-label={filterLabel}>
            {motives.map((m) => (
              <button key={m} className="chip" aria-pressed={motive === m} onClick={() => setMotive(m)}>
                {m}
              </button>
            ))}
          </div>
        )}
      </div>
      {visible.length > 0 ? (
        <div className="grid">
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <p>Pronto sumamos productos a esta sección.</p>
      )}
    </section>
  );
}
