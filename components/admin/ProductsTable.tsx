"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { setProductStatus } from "@/lib/actions/admin-products";
import { SECTIONS, type Section } from "@/lib/config";
import type { Product, ProductStatus } from "@/lib/domain/catalog";
import { formatMoney } from "@/lib/domain/money";

const SECTION_LABEL: Record<Section, string> = { desayunos: "Desayunos", tortas: "Tortas", dulces: "Dulces" };
const STATUS_LABEL: Record<ProductStatus, { label: string; cls: string }> = {
  active: { label: "Activo", cls: "ok" },
  unavailable: { label: "No disponible", cls: "pend" },
  hidden: { label: "Oculto", cls: "off" },
};

export function ProductsTable({ products }: { products: Product[] }) {
  const [section, setSection] = useState<Section | "todas">("todas");
  const [status, setStatus] = useState<ProductStatus | "todos">("todos");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const visible = products.filter(
    (p) => (section === "todas" || p.section === section) && (status === "todos" || p.status === status),
  );

  function change(id: string, next: ProductStatus) {
    setError(null);
    startTransition(async () => {
      const result = await setProductStatus(id, next);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <>
      <div className="chips" role="group" aria-label="Filtrar por sección" style={{ marginBottom: 10 }}>
        {(["todas", ...SECTIONS] as const).map((s) => (
          <button key={s} type="button" className="chip" aria-pressed={section === s} onClick={() => setSection(s)}>
            {s === "todas" ? "Todas" : SECTION_LABEL[s]}
          </button>
        ))}
      </div>
      <div className="chips" role="group" aria-label="Filtrar por estado" style={{ marginBottom: 16 }}>
        {(["todos", "active", "unavailable", "hidden"] as const).map((s) => (
          <button key={s} type="button" className="chip" aria-pressed={status === s} onClick={() => setStatus(s)}>
            {s === "todos" ? "Todos los estados" : STATUS_LABEL[s].label}
          </button>
        ))}
      </div>

      {error && (
        <p className="hint" role="alert" style={{ color: "var(--accent-dark)" }}>
          {error}
        </p>
      )}

      {visible.length === 0 ? (
        <div className="empty">
          <p className="serif">No hay productos con ese filtro</p>
        </div>
      ) : (
        <div className="orders">
          {visible.map((p) => (
            <article key={p.id} className="order" style={{ gridTemplateColumns: "72px minmax(0,1fr) auto" }}>
              <div style={{ position: "relative", width: 72, height: 54, borderRadius: 10, overflow: "hidden", background: "var(--line)" }}>
                {p.imageUrl && <Image src={p.imageUrl} alt="" fill sizes="72px" style={{ objectFit: "cover" }} />}
              </div>
              <div>
                <span className={`pill ${STATUS_LABEL[p.status].cls}`}>{STATUS_LABEL[p.status].label}</span>
                <h3 style={{ marginTop: 6 }}>{p.name}</h3>
                <p className="hint" style={{ margin: 0 }}>
                  {SECTION_LABEL[p.section]}
                  {p.motive ? ` · ${p.motive}` : ""} · {formatMoney(p.price)} · orden {p.sortOrder}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <Link href={`/admin/productos/${p.id}`} className="btn btn-ghost">
                  Editar
                </Link>
                {p.status !== "active" && (
                  <button type="button" className="btn btn-primary" disabled={pending} onClick={() => change(p.id, "active")}>
                    Activar
                  </button>
                )}
                {p.status === "active" && (
                  <button type="button" className="btn btn-ghost" disabled={pending} onClick={() => change(p.id, "unavailable")}>
                    No disponible
                  </button>
                )}
                {p.status !== "hidden" && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm(`¿Ocultar “${p.name}” de la tienda?`)) change(p.id, "hidden");
                    }}
                  >
                    Ocultar
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
