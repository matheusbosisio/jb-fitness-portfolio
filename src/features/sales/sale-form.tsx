"use client";

import { useActionState, useMemo, useState } from "react";

import { createSale } from "./actions";
import { calculateSaleTotal, type SaleActionState } from "./validation";

type VariantOption = { id: string; label: string; stockQuantity: number; salePrice: string };
export type SaleItem = { variantId: string; quantity: number; unitSalePrice: string };
type SaleAction = (state: SaleActionState, formData: FormData) => Promise<SaleActionState>;
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function SaleForm({ variants, today, action: saleAction = createSale, initial }: { variants: VariantOption[]; today: string; action?: SaleAction; initial?: { soldOn: string; paymentMethod: string; items: SaleItem[] } }) {
  const [state, action, pending] = useActionState(saleAction, {});
  const [items, setItems] = useState<SaleItem[]>(initial?.items ?? [{ variantId: "", quantity: 1, unitSalePrice: "" }]);
  const total = useMemo(() => calculateSaleTotal(items.filter((item) => /^\d+([,.]\d{1,2})?$/.test(item.unitSalePrice))), [items]);
  const updateItem = (index: number, patch: Partial<SaleItem>) => setItems((current) => current.map((item, position) => position === index ? { ...item, ...patch } : item));
  const selectVariant = (index: number, variantId: string) => {
    const variant = variants.find((option) => option.id === variantId);
    updateItem(index, { variantId, unitSalePrice: variant?.salePrice.replace(".", ",") ?? "" });
  };

  return (
    <form action={action} className="space-y-8">
      <input name="items" type="hidden" value={JSON.stringify(items)} />
      <section className="grid gap-5 rounded-2xl border border-border bg-white p-5 sm:grid-cols-2 sm:p-7">
        <div><label className="mb-2 block text-sm font-semibold" htmlFor="soldOn">Data da venda</label><input className="field" defaultValue={initial?.soldOn ?? today} id="soldOn" max={today} name="soldOn" required type="date" /></div>
        <div><label className="mb-2 block text-sm font-semibold" htmlFor="paymentMethod">Forma de pagamento</label><select className="field" defaultValue={initial?.paymentMethod ?? ""} id="paymentMethod" name="paymentMethod" required><option disabled value="">Selecione</option><option value="PIX">Pix</option><option value="CASH">Dinheiro</option><option value="DEBIT_CARD">Cartão de débito</option><option value="CREDIT_CARD">Cartão de crédito</option></select></div>
      </section>
      <section className="rounded-2xl border border-border bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Peças vendidas</h2><p className="mt-1 text-sm text-muted">O preço pode ser ajustado individualmente para aplicar desconto ou acréscimo.</p></div><button className="min-h-11 w-full rounded-xl border border-border px-4 text-sm font-semibold hover:border-brand sm:w-auto" onClick={() => setItems((current) => [...current, { variantId: "", quantity: 1, unitSalePrice: "" }])} type="button">Adicionar peça</button></div>
        <div className="mt-5 space-y-3">
          {items.map((item, index) => {
            const selected = variants.find((variant) => variant.id === item.variantId);
            return <div className="grid gap-3 rounded-xl bg-background p-4 md:grid-cols-[1fr_120px_170px_auto] md:items-end" key={index}>
              <div><label className="mb-2 block text-sm font-medium" htmlFor={`sale-variant-${index}`}>Produto e variação</label><select className="field" id={`sale-variant-${index}`} required value={item.variantId} onChange={(event) => selectVariant(index, event.target.value)}><option disabled value="">Selecione</option>{variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>)}</select>{selected ? <p className="mt-1 text-xs text-muted">Disponível agora: {selected.stockQuantity}</p> : null}</div>
              <div><label className="mb-2 block text-sm font-medium" htmlFor={`sale-quantity-${index}`}>Quantidade</label><input className="field" id={`sale-quantity-${index}`} min="1" required type="number" value={item.quantity} onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })} /></div>
              <div><label className="mb-2 block text-sm font-medium" htmlFor={`sale-price-${index}`}>Preço por peça</label><input className="field" id={`sale-price-${index}`} inputMode="decimal" placeholder="129,90" required value={item.unitSalePrice} onChange={(event) => updateItem(index, { unitSalePrice: event.target.value })} />{selected && item.unitSalePrice ? <p className="mt-1 text-xs text-muted">Cadastrado: {money.format(Number(selected.salePrice))}</p> : null}</div>
              <button aria-label={`Remover peça ${index + 1}`} className="min-h-11 rounded-xl px-3 text-sm font-medium text-red-700 disabled:text-muted" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, position) => position !== index))} type="button">Remover</button>
            </div>;
          })}
        </div>
        <div className="mt-5 flex justify-end border-t border-border pt-5 text-lg font-semibold">Total da venda: {money.format(total)}</div>
      </section>
      {state.error ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">{state.error}</p> : null}
      <div className="flex justify-end"><button className="min-h-12 w-full rounded-xl bg-brand-strong px-6 font-semibold text-white disabled:opacity-60 sm:w-auto" disabled={pending || variants.length === 0} type="submit">{pending ? "Salvando..." : initial ? "Salvar correção" : "Concluir venda"}</button></div>
    </form>
  );
}
