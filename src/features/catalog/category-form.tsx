"use client";

import { useActionState, useEffect, useRef } from "react";

import { createCategory } from "./actions";

export function CategoryForm() {
  const [state, action, pending] = useActionState(createCategory, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="mt-4 flex flex-col gap-3 sm:flex-row">
      <div className="flex-1">
        <label className="sr-only" htmlFor="category-name">Nome da categoria</label>
        <input className="min-h-11 w-full rounded-xl border border-border bg-white px-4 outline-none focus:border-brand" id="category-name" name="name" placeholder="Ex.: Tops" required />
      </div>
      <button className="min-h-11 rounded-xl bg-foreground px-5 font-semibold text-white disabled:opacity-60" disabled={pending} type="submit">
        {pending ? "Salvando..." : "Adicionar categoria"}
      </button>
      {state.error ? <p className="text-sm text-red-700 sm:self-center" role="alert">{state.error}</p> : null}
    </form>
  );
}
