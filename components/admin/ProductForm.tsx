"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveProduct, type SaveProductResult } from "@/lib/actions/admin-products";
import { SECTIONS } from "@/lib/config";
import type { Product } from "@/lib/domain/catalog";

const SECTION_LABEL = { desayunos: "Desayunos", tortas: "Tortas", dulces: "Dulces" } as const;

function Field({ name, label, errors, children }: { name: string; label: string; errors?: string[]; children: React.ReactNode }) {
  return (
    <div className={errors?.length ? "field invalid" : "field"}>
      <label htmlFor={`p-${name}`}>{label}</label>
      {children}
      {errors?.length ? <span className="err">{errors[0]}</span> : null}
    </div>
  );
}

/** Alta (sin `product`) o edición. La validación real ocurre en la Server Action. */
export function ProductForm({ product }: { product?: Product }) {
  const [state, formAction, isPending] = useActionState<SaveProductResult, FormData>(saveProduct, null);
  const errors = state?.fieldErrors ?? {};
  // Tras un error se conserva lo escrito (el formulario no es controlado y React lo reinicia al enviar).
  const v = (key: string, fallback: string) => state?.values[key] ?? fallback;

  return (
    <form action={formAction} noValidate style={{ maxWidth: 560 }}>
      {product && <input type="hidden" name="id" value={product.id} />}
      {errors.form && (
        <p role="alert" className="hint" style={{ color: "var(--accent-dark)" }}>
          {errors.form[0]}
        </p>
      )}

      <Field name="name" label="Nombre" errors={errors.name}>
        <input id="p-name" name="name" defaultValue={v("name", product?.name ?? "")} maxLength={120} required />
      </Field>
      <Field name="description" label="Descripción" errors={errors.description}>
        <textarea id="p-description" name="description" rows={3} maxLength={500} defaultValue={v("description", product?.description ?? "")} />
      </Field>
      <div className="two">
        <Field name="price" label="Precio (ARS)" errors={errors.price}>
          <input id="p-price" name="price" inputMode="numeric" defaultValue={v("price", product ? String(product.price) : "")} required />
        </Field>
        <Field name="sortOrder" label="Orden" errors={errors.sortOrder}>
          <input id="p-sortOrder" name="sortOrder" inputMode="numeric" defaultValue={v("sortOrder", product ? String(product.sortOrder) : "0")} required />
        </Field>
      </div>
      <div className="two">
        <Field name="section" label="Sección" errors={errors.section}>
          <select id="p-section" name="section" defaultValue={v("section", product?.section ?? "desayunos")}>
            {SECTIONS.map((s) => (
              <option key={s} value={s}>
                {SECTION_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field name="status" label="Estado" errors={errors.status}>
          <select id="p-status" name="status" defaultValue={v("status", product?.status ?? "active")}>
            <option value="active">Activo</option>
            <option value="unavailable">No disponible</option>
            <option value="hidden">Oculto</option>
          </select>
        </Field>
      </div>
      <Field name="motive" label="Motivo (solo desayunos y tortas)" errors={errors.motive}>
        <input id="p-motive" name="motive" maxLength={40} placeholder="Ej: Cumpleaños" defaultValue={v("motive", product?.motive ?? "")} />
      </Field>
      <Field name="image" label="Imagen (JPG, PNG o WEBP, hasta 2 MB)" errors={errors.image}>
        <input id="p-image" name="image" type="file" accept="image/jpeg,image/png,image/webp" />
        {product?.imageUrl && <span className="hint">Ya tiene imagen; subí otra solo si querés reemplazarla.</span>}
      </Field>

      <div style={{ display: "flex", gap: 10 }}>
        <Link href="/admin/productos" className="btn btn-ghost">
          Cancelar
        </Link>
        <button type="submit" className="btn btn-primary" disabled={isPending}>
          {isPending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
