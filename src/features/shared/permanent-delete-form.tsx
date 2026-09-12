"use client";

import { useActionState } from "react";

type State = { error?: string };

export function PermanentDeleteForm({ action, title, description, buttonLabel }: { action: (state: State, formData: FormData) => Promise<State>; title: string; description: string; buttonLabel: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return <section className="rounded-2xl border border-red-200 bg-red-50 p-5 sm:p-6"><h2 className="font-semibold text-red-900">{title}</h2><p className="mt-2 text-sm leading-6 text-red-800">{description}</p><form action={formAction} className="mt-4 space-y-4"><label className="flex items-start gap-3 text-sm text-red-900"><input className="mt-1 size-4" name="confirmation" required type="checkbox" />Confirmo que desejo excluir este registro definitivamente.</label>{state.error ? <p className="text-sm font-medium text-red-800" role="alert">{state.error}</p> : null}<button className="min-h-11 w-full rounded-xl bg-red-700 px-4 font-semibold text-white disabled:opacity-60 sm:w-auto" disabled={pending} type="submit">{pending ? "Excluindo..." : buttonLabel}</button></form></section>;
}
