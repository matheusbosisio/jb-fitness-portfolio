"use client";

import { useActionState } from "react";

import { login } from "./actions";
import type { LoginState } from "./validation";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initialState);

  return (
    <form action={action} className="mt-8 space-y-5">
      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="email">
          E-mail
        </label>
        <input
          autoComplete="email"
          autoFocus
          className="h-12 w-full rounded-xl border border-border bg-white px-4 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
          id="email"
          inputMode="email"
          name="email"
          required
          type="email"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="password">
          Senha
        </label>
        <input
          autoComplete="current-password"
          className="h-12 w-full rounded-xl border border-border bg-white px-4 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
          id="password"
          maxLength={128}
          name="password"
          required
          type="password"
        />
      </div>

      {state.error ? (
        <p
          aria-live="polite"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <button
        className="h-12 w-full rounded-xl bg-foreground px-5 font-semibold text-white transition hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
