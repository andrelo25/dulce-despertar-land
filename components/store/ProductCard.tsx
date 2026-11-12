import Image from "next/image";
import type { Product } from "@/lib/domain/catalog";
import { formatMoney } from "@/lib/domain/money";

export function ProductCard({ product }: { product: Product }) {
  const off = product.status !== "active";
  return (
    <article className={off ? "card is-off" : "card"}>
      <div className="ph">
        {product.imageUrl && (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 1100px) 280px, (min-width: 640px) 33vw, 50vw"
          />
        )}
        {product.motive && <span className="tag">{product.motive}</span>}
        {off && <span className="tag tag-off">No disponible</span>}
      </div>
      <div className="body">
        <h3>{product.name}</h3>
        <p className="desc">{product.description}</p>
        <div className="foot">
          <span className="price">{formatMoney(product.price)}</span>
          <button className="add" disabled={off}>
            {off ? "No disponible" : "Agregar"}
          </button>
        </div>
      </div>
    </article>
  );
}
