"use client";

import { useActionState, useState } from "react";

import { createStockEntry } from "./actions";
import type { StockEntryActionState } from "./validation";

type VariantOption = { id: string; label: string };
export type EntryItem = { variantId: string; quantity: number; unitCost: string };
type EntryAction = (state: StockEntryActionState, formData: FormData) => Promise<StockEntryActionState>;

export function StockEntryForm({ variants, today, action: entryAction = createStockEntry, initial }: { variants: VariantOption[]; today: string; action?: EntryAction; initial?: { occurredOn: string; notes: string; items: EntryItem[] } }) {
  const [state, action, pending] = useActionState(entryAction, {});
  const [items, setItems] = useState<EntryItem[]>(initial?.items ?? [{ variantId: "", quantity: 1, unitCost: "" }]);
  const updateItem = (index: number, patch: Partial<EntryItem>) => setItems((current) => current.map((item, position) => position === index ? { ...item, ...patch } : item));

  return (
    <form action={action} className="space-y-8">
      <input name="items" type="hidden" value={JSON.stringify(items)} />
      <section className="grid gap-5 rounded-2xl border border-border bg-white p-5 sm:grid-cols-2 sm:p-7">
        <div><label className="mb-2 block text-sm font-semibold" htmlFor="occurredOn">Data da entrada</label><input className="field" defaultValue={initial?.occurredOn ?? today} id="occurredOn" max={today} name="occurredOn" required type="date" /></div>
        <div><label className="mb-2 block text-sm font-semibold" htmlFor="notes">Observação <span className="font-normal text-muted">(opcional)</span></label><input className="field" defaultValue={initial?.notes ?? ""} id="notes" maxLength={500} name="notes" placeholder="Ex.: reposição do fornecedor" /></div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Peças recebidas</h2><p className="mt-1 text-sm text-muted">Informe a quantidade e o custo de compra de cada variação.</p></div><button className="min-h-11 w-full rounded-xl border border-border px-4 text-sm font-semibold hover:border-brand sm:w-auto" onClick={() => setItems((current) => [...current, { variantId: "", quantity: 1, unitCost: "" }])} type="button">Adicionar item</button></div>
        <div className="mt-5 space-y-3">
          {items.map((item, index) => (
            <div className="grid gap-3 rounded-xl bg-background p-4 md:grid-cols-[1fr_120px_160px_auto] md:items-end" key={index}>
              <div><label className="mb-2 block text-sm font-medium" htmlFor={`variant-${index}`}>Produto e variação</label><select className="field" id={`variant-${index}`} required value={item.variantId} onChange={(event) => updateItem(index, { variantId: event.target.value })}><option disabled value="">Selecione</option>{variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>)}</select></div>
              <div><label className="mb-2 block text-sm font-medium" htmlFor={`quantity-${index}`}>Quantidade</label><input className="field" id={`quantity-${index}`} min="1" required type="number" value={item.quantity} onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })} /></div>
              <div><label className="mb-2 block text-sm font-medium" htmlFor={`cost-${index}`}>Custo unitário</label><input className="field" id={`cost-${index}`} inputMode="decimal" placeholder="50,00" required value={item.unitCost} onChange={(event) => updateItem(index, { unitCost: event.target.value })} /></div>
              <button aria-label={`Remover item ${index + 1}`} className="min-h-11 rounded-xl px-3 text-sm font-medium text-red-700 disabled:text-muted" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, position) => position !== index))} type="button">Remover</button>
            </div>
          ))}
        </div>
      </section>
      {state.error ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">{state.error}</p> : null}
      <div className="flex justify-end"><button className="min-h-12 w-full rounded-xl bg-brand-strong px-6 font-semibold text-white disabled:opacity-60 sm:w-auto" disabled={pending || variants.length === 0} type="submit">{pending ? "Salvando..." : initial ? "Salvar correção" : "Confirmar entrada"}</button></div>
    </form>
  );
}
