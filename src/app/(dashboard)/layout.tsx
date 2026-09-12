import Link from "next/link";
import Image from "next/image";

import { logout } from "@/features/auth/actions";
import { requireUser } from "@/features/auth/session";
import { DashboardNavigation } from "@/features/navigation/dashboard-navigation";
import { ThemeToggle } from "@/features/theme/theme-toggle";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-dvh bg-background">
      <a className="skip-link" href="#conteudo-principal">Pular para o conteúdo</a>
      <header className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-4 sm:px-8">
          <Link className="mr-auto flex items-center gap-3" href="/dashboard">
            <Image alt="Logo JB Moda Fitness" className="size-11 rounded-xl object-cover ring-2 ring-brand/25" height={44} priority src="/brand/jb-moda-fitness.jpg" width={44} />
            <span><span className="block font-semibold leading-5">JB Fitness</span><span className="block text-xs text-muted">Olá, {user.name}</span></span>
          </Link>
          <DashboardNavigation />
          <ThemeToggle />
          <form action={logout}><button className="min-h-10 rounded-xl border border-border px-3 text-sm font-medium hover:border-brand sm:px-4" type="submit">Sair</button></form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10" id="conteudo-principal">{children}</main>
    </div>
  );
}
