"use client";

import Image from "next/image";
import { useActionState, useState } from "react";

import { createProduct } from "./actions";
import { acceptedProductImageTypes, MAX_PRODUCT_IMAGE_BYTES } from "./image-constants";
import { productImageUrl } from "./image-key";
import type { CatalogActionState } from "./validation";
import { productSizes } from "./validation";

type Category = { id: string; name: string };
type Variant = { id?: string; color: string; size: (typeof productSizes)[number]; active: boolean };
type ProductAction = (state: CatalogActionState, formData: FormData) => Promise<CatalogActionState>;
export type ProductInitialValues = { name: string; categoryId: string; description: string; salePrice: string; imageKey: string | null; variants: Variant[] };

const sizeLabels = { NO_SIZE: "Sem tamanho", P: "P", M: "M", G: "G", GG: "GG" };

export function ProductForm({ categories, action: productAction = createProduct, initial }: { categories: Category[]; action?: ProductAction; initial?: ProductInitialValues }) {
  const [state, action, pending] = useActionState(productAction, {});
  const [variants, setVariants] = useState<Variant[]>(initial?.variants ?? [{ color: "", size: "NO_SIZE", active: true }]);

  const updateVariant = (index: number, patch: Partial<Variant>) =>
    setVariants((current) => current.map((variant, position) => position === index ? { ...variant, ...patch } : variant));

  return (
    <form action={action} className="space-y-8">
      <input name="variants" type="hidden" value={JSON.stringify(variants)} />
      <section className="grid gap-5 rounded-2xl border border-border bg-white p-5 sm:grid-cols-2 sm:p-7">
        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-semibold" htmlFor="name">Nome do produto</label>
          <input className="field" defaultValue={initial?.name} id="name" name="name" placeholder="Ex.: Conjunto Energy" required />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold" htmlFor="categoryId">Categoria</label>
          <select className="field" id="categoryId" name="categoryId" required defaultValue={initial?.categoryId ?? ""}>
            <option disabled value="">Selecione</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold" htmlFor="salePrice">Preço padrão</label>
          <input className="field" defaultValue={initial?.salePrice} id="salePrice" inputMode="decimal" name="salePrice" placeholder="149,90" required />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-semibold" htmlFor="description">Descrição <span className="font-normal text-muted">(opcional)</span></label>
          <textarea className="field min-h-24 py-3" defaultValue={initial?.description} id="description" name="description" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-semibold" htmlFor="image">Foto do produto <span className="font-normal text-muted">(opcional)</span></label>
          <div className="flex flex-wrap items-center gap-4">
            {initial?.imageKey ? <Image alt={`Foto atual de ${initial.name}`} className="h-24 w-24 rounded-xl object-cover" height={96} src={productImageUrl(initial.imageKey) ?? ""} width={96} /> : <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-background text-center text-xs text-muted">Sem foto</div>}
            <div className="min-w-60 flex-1"><input accept={acceptedProductImageTypes} className="block w-full text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-background file:px-4 file:py-3 file:font-semibold" id="image" name="image" type="file" /><p className="mt-2 text-xs text-muted">JPG, PNG ou WebP de até {Math.round(MAX_PRODUCT_IMAGE_BYTES / 1000)} KB.</p>{initial?.imageKey ? <label className="mt-3 flex items-center gap-2 text-sm text-red-700"><input name="removeImage" type="checkbox" /> Remover a foto atual</label> : null}</div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold">Variações</h2><p className="mt-1 text-sm text-muted">Cor é livre; tamanho pode ficar em branco.</p></div>
          <button className="min-h-11 w-full rounded-xl border border-border px-4 text-sm font-semibold hover:border-brand sm:w-auto" onClick={() => setVariants((current) => [...current, { color: "", size: "NO_SIZE", active: true }])} type="button">Adicionar variação</button>
        </div>
        <div className="mt-5 space-y-3">
          {variants.map((variant, index) => (
            <div className="grid gap-3 rounded-xl bg-background p-4 sm:grid-cols-[1fr_180px_auto] sm:items-end" key={variant.id ?? `nova-${index}`}>
              <div><label className="mb-2 block text-sm font-medium" htmlFor={`color-${index}`}>Cor <span className="font-normal text-muted">(opcional)</span></label><input className="field" id={`color-${index}`} value={variant.color} onChange={(event) => updateVariant(index, { color: event.target.value })} /></div>
              <div><label className="mb-2 block text-sm font-medium" htmlFor={`size-${index}`}>Tamanho</label><select className="field" id={`size-${index}`} value={variant.size} onChange={(event) => updateVariant(index, { size: event.target.value as Variant["size"] })}>{productSizes.map((size) => <option key={size} value={size}>{sizeLabels[size]}</option>)}</select></div>
              {variant.id ? <button className="min-h-11 rounded-xl px-3 text-sm font-medium text-brand-strong disabled:text-muted" disabled={variant.active && variants.filter((item) => item.active).length === 1} onClick={() => updateVariant(index, { active: !variant.active })} type="button">{variant.active ? "Desativar" : "Reativar"}</button> : <button aria-label={`Remover variação ${index + 1}`} className="min-h-11 rounded-xl px-3 text-sm font-medium text-red-700 disabled:text-muted" disabled={variants.length === 1} onClick={() => setVariants((current) => current.filter((_, position) => position !== index))} type="button">Remover</button>}
              {!variant.active ? <p className="text-sm font-medium text-amber-800 sm:col-span-3">Esta variação está inativa e não aparece em novas entradas ou vendas.</p> : null}
            </div>
          ))}
        </div>
      </section>

      {state.error ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">{state.error}</p> : null}
      <div className="flex justify-end"><button className="min-h-12 w-full rounded-xl bg-brand-strong px-6 font-semibold text-white disabled:opacity-60 sm:w-auto" disabled={pending || categories.length === 0} type="submit">{pending ? "Salvando..." : initial ? "Salvar alterações" : "Salvar produto"}</button></div>
    </form>
  );
}
