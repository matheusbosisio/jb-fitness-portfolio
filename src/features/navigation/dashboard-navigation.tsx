"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Início" },
  { href: "/produtos", label: "Produtos" },
  { href: "/entradas", label: "Entradas" },
  { href: "/vendas", label: "Vendas" },
  { href: "/relatorios", label: "Relatórios" },
  { href: "/backup", label: "Backup" },
];

export function DashboardNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegação principal" className="order-3 -mx-1 flex w-[calc(100%+0.5rem)] gap-1 overflow-x-auto px-1 pb-1 md:order-none md:mx-0 md:w-auto md:pb-0">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return <Link aria-current={active ? "page" : undefined} className="nav-link shrink-0" href={link.href} key={link.href}>{link.label}</Link>;
      })}
    </nav>
  );
}
