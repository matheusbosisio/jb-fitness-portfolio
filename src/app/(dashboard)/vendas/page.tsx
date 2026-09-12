import Link from "next/link";

import { requireUser } from "@/features/auth/session";
import { prisma } from "@/server/db/client";

const date = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const paymentLabels = { PIX: "Pix", CASH: "Dinheiro", DEBIT_CARD: "Débito", CREDIT_CARD: "Crédito" };

type Props = { searchParams: Promise<{ excluida?: string }> };

export default async function SalesPage({ searchParams }: Props) {
  await requireUser();
  const { excluida } = await searchParams;
  const sales = await prisma.sale.findMany({ include: { items: { select: { quantity: true } } }, orderBy: [{ soldAt: "desc" }, { createdAt: "desc" }], take: 100 });

  return <div className="space-y-8">
    {excluida === "1" ? <p className="rounded-xl bg-green-50 p-4 text-sm text-green-800" role="status">Venda excluída e estoque recalculado.</p> : null}
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-strong">Comercial</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Vendas</h1><p className="mt-2 text-muted">Histórico de vendas e resultados.</p></div><Link className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-strong px-5 font-semibold text-white sm:w-auto" href="/vendas/nova">Nova venda</Link></header>
    {sales.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center sm:p-10"><h2 className="font-semibold">Nenhuma venda registrada</h2><p className="mt-2 text-sm text-muted">Conclua a primeira venda para iniciar o histórico.</p></div> : <div className="overflow-hidden rounded-2xl border border-border bg-white"><div className="hidden grid-cols-[140px_1fr_150px_150px] gap-4 border-b border-border bg-background px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:grid"><span>Data</span><span>Pagamento</span><span>Total</span><span>Lucro</span></div>{sales.map((sale) => <Link className={`grid gap-3 border-b border-border px-4 py-4 last:border-0 sm:grid-cols-[140px_1fr_150px_150px] sm:items-center sm:gap-4 sm:px-5 ${sale.status === "CANCELLED" ? "opacity-55" : "hover:bg-background"}`} href={`/vendas/${sale.id}`} key={sale.id}><p className="font-medium">{date.format(sale.soldAt)}</p><div><p>{paymentLabels[sale.paymentMethod]}</p><p className="text-sm text-muted">{sale.status === "CANCELLED" ? "Cancelada · " : ""}{sale.items.reduce((sum, item) => sum + item.quantity, 0)} peças</p></div><p className="flex justify-between gap-3 font-medium sm:block"><span className="text-sm text-muted sm:hidden">Total</span>{money.format(Number(sale.totalRevenue))}</p><p className="flex justify-between gap-3 font-medium text-green-700 sm:block"><span className="text-sm text-muted sm:hidden">Lucro</span>{money.format(Number(sale.totalGrossProfit))}</p></Link>)}</div>}
  </div>;
}
