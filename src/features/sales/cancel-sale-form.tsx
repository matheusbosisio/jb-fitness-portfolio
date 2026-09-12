"use client";

import { useActionState } from "react";

import { cancelSale } from "./actions";

export function CancelSaleForm({ saleId }: { saleId: string }) {
  const [state, action, pending] = useActionState(cancelSale.bind(null, saleId), {});
  return <form action={action} className="rounded-2xl border border-red-100 bg-red-50 p-5"><h2 className="font-semibold text-red-900">Cancelar venda</h2><p className="mt-1 text-sm text-red-800">As peças voltarão ao estoque e o histórico posterior será recalculado.</p><label className="mt-4 block text-sm font-medium text-red-900" htmlFor="reason">Motivo <span className="font-normal">(opcional)</span></label><div className="mt-2 flex flex-col gap-3 sm:flex-row"><input className="field flex-1" id="reason" maxLength={500} name="reason" placeholder="Ex.: cliente desistiu" /><button className="min-h-11 rounded-xl bg-red-700 px-5 font-semibold text-white disabled:opacity-60" disabled={pending} type="submit">{pending ? "Cancelando..." : "Cancelar venda"}</button></div>{state.error ? <p className="mt-3 text-sm text-red-800" role="alert">{state.error}</p> : null}</form>;
}
