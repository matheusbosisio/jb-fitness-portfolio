import Image from "next/image";
import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-5 py-10">
      <section className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-[0_24px_80px_-48px_rgba(30,20,25,0.35)] sm:p-9">
        <Image alt="Logo JB Moda Fitness" className="size-24 rounded-2xl object-cover ring-2 ring-brand/30 ring-offset-2 ring-offset-surface" height={96} priority src="/brand/jb-moda-fitness.jpg" width={96} />
        <p className="mt-7 text-sm font-semibold uppercase tracking-[0.18em] text-brand-strong">
          Área protegida
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Acesse a gestão da loja
        </h1>
        <p className="mt-3 leading-7 text-muted">
          Entre com a conta da proprietária para consultar estoque e vendas.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
