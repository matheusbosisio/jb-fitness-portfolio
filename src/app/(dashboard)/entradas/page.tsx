import Link from "next/link";

import { requireUser } from "@/features/auth/session";
import { prisma } from "@/server/db/client";

type Props = { searchParams: Promise<{ criada?: string; excluida?: string }> };
const date = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function StockEntriesPage({ searchParams }: Props) {
  await requireUser();
  const { criada, excluida } = await searchParams;
  const entries = await prisma.stockEntry.findMany({
    include: { items: { select: { quantity: true, unitCost: true } } },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-strong">Estoque</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Entradas</h1><p className="mt-2 text-muted">Histórico das peças recebidas e seus custos.</p></div><Link className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-strong px-5 font-semibold text-white sm:w-auto" href="/entradas/nova">Nova entrada</Link></header>
      {excluida === "1" ? <p className="rounded-xl bg-green-50 p-4 text-sm text-green-800" role="status">Entrada excluída e estoque recalculado.</p> : null}
      {criada === "1" ? <p className="rounded-xl bg-green-50 p-4 text-sm text-green-800" role="status">Entrada registrada e estoque atualizado.</p> : null}
      {entries.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center sm:p-10"><h2 className="font-semibold">Nenhuma entrada registrada</h2><p className="mt-2 text-sm text-muted">Registre o estoque inicial ou uma reposição.</p></div> : <div className="overflow-hidden rounded-2xl border border-border bg-white"><div className="hidden grid-cols-[160px_1fr_160px_140px] gap-4 border-b border-border bg-background px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:grid"><span>Data</span><span>Observação</span><span>Quantidade</span><span>Investimento</span></div>{entries.map((entry) => { const quantity = entry.items.reduce((sum, item) => sum + item.quantity, 0); const total = entry.items.reduce((sum, item) => sum + item.quantity * Number(item.unitCost), 0); return <Link className={`grid gap-3 border-b border-border px-4 py-4 last:border-0 sm:grid-cols-[160px_1fr_160px_140px] sm:items-center sm:gap-4 sm:px-5 ${entry.status === "CORRECTED" ? "opacity-55" : "hover:bg-background"}`} href={`/entradas/${entry.id}`} key={entry.id}><p className="font-medium">{date.format(entry.occurredAt)}</p><div><p>{entry.notes || "Sem observação"}</p><p className="text-sm text-muted">{entry.status === "CORRECTED" ? "Corrigida · " : ""}{entry.items.length} {entry.items.length === 1 ? "item" : "itens"}</p></div><p className="flex justify-between gap-3 sm:block"><span className="text-sm font-medium text-muted sm:hidden">Quantidade</span>{quantity} peças</p><p className="flex justify-between gap-3 font-medium sm:block"><span className="text-sm text-muted sm:hidden">Investimento</span>{money.format(total)}</p></Link>; })}</div>}
    </div>
  );
}
