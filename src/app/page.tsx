import Link from "next/link";
import Image from "next/image";

const foundations = [
  "Catálogo com variações de cor e tamanho",
  "Estoque protegido por regras transacionais",
  "Vendas com custo histórico preservado",
];

export default function Home() {
  return (
    <main className="min-h-dvh bg-background px-5 py-8 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-5xl flex-col">
        <header className="flex items-center gap-3" aria-label="JB Fitness">
          <Image alt="Logo JB Moda Fitness" className="size-16 rounded-2xl object-cover shadow-sm ring-2 ring-brand/30 ring-offset-2 ring-offset-background" height={64} priority src="/brand/jb-moda-fitness.jpg" width={64} />
          <div>
            <p className="font-semibold tracking-tight text-foreground">
              JB Fitness
            </p>
            <p className="text-sm text-muted">Gestão de estoque e vendas</p>
          </div>
        </header>

        <section className="flex flex-1 items-center py-16 sm:py-24">
          <div className="grid w-full gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-brand-strong">
                Fundação do projeto
              </p>
              <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-[-0.04em] text-foreground sm:text-6xl">
                Controle confiável para decisões reais da loja.
              </h1>
              <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted">
                Cadastre produtos, acompanhe entradas e vendas e consulte os
                resultados da loja em um só lugar.
              </p>
              <Link
                className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-foreground px-6 font-semibold text-white transition hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                href="/login"
              >
                Acessar o sistema
              </Link>
            </div>

            <div className="rounded-3xl border border-border bg-surface p-6 shadow-[0_24px_80px_-48px_rgba(30,20,25,0.35)] sm:p-8">
              <p className="text-sm font-medium text-muted">Princípios do MVP</p>
              <ul className="mt-5 space-y-4">
                {foundations.map((foundation) => (
                  <li className="flex gap-3 text-sm leading-6" key={foundation}>
                    <span
                      className="mt-2 size-2 shrink-0 rounded-full bg-brand"
                      aria-hidden="true"
                    />
                    <span>{foundation}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <footer className="border-t border-border py-5 text-sm text-muted">
          Conforto, estilo e performance — também na gestão.
        </footer>
      </div>
    </main>
  );
}
