import { requireUser } from "@/features/auth/session";
import { integer, money, paymentLabels } from "@/features/reports/format";
import { MetricCard } from "@/features/reports/metric-card";
import { parseReportPeriod, todayInSaoPaulo } from "@/features/reports/period";
import { prisma } from "@/server/db/client";

type Props = { searchParams: Promise<{ inicio?: string; fim?: string }> };
type ProductResult = { name: string; quantity: number; revenue: number; cost: number };

export default async function ReportsPage({ searchParams }: Props) {
  await requireUser();
  const query = await searchParams;
  const period = parseReportPeriod(query.inicio, query.fim);
  const dateFilter = { gte: period.from, lt: period.until };
  const [sales, cancelledCount, variants] = await Promise.all([
    prisma.sale.findMany({ where: { status: "COMPLETED", soldAt: dateFilter }, include: { items: { include: { productVariant: { include: { product: { select: { name: true } } } } } } }, orderBy: { soldAt: "desc" } }),
    prisma.sale.count({ where: { status: "CANCELLED", soldAt: dateFilter, replacement: null } }),
    prisma.productVariant.findMany({ where: { active: true, product: { active: true } }, select: { stockQuantity: true, averageUnitCost: true } }),
  ]);
  let revenue = 0; let cost = 0; let units = 0;
  const byPayment = new Map<string, { count: number; revenue: number }>();
  const byProduct = new Map<string, ProductResult>();
  for (const sale of sales) {
    revenue += Number(sale.totalRevenue); cost += Number(sale.totalCost);
    const payment = byPayment.get(sale.paymentMethod) ?? { count: 0, revenue: 0 };
    payment.count += 1; payment.revenue += Number(sale.totalRevenue); byPayment.set(sale.paymentMethod, payment);
    for (const item of sale.items) {
      units += item.quantity;
      const name = item.productVariant.product.name;
      const product = byProduct.get(name) ?? { name, quantity: 0, revenue: 0, cost: 0 };
      product.quantity += item.quantity; product.revenue += Number(item.lineRevenue); product.cost += Number(item.lineCost); byProduct.set(name, product);
    }
  }
  const grossProfit = revenue - cost;
  const averageTicket = sales.length ? revenue / sales.length : 0;
  const stockUnits = variants.reduce((sum, variant) => sum + variant.stockQuantity, 0);
  const stockValue = variants.reduce((sum, variant) => sum + variant.stockQuantity * Number(variant.averageUnitCost), 0);
  const products = [...byProduct.values()].sort((left, right) => right.revenue - left.revenue);
  const maxRevenue = Math.max(...products.map((product) => product.revenue), 1);

  return <div className="space-y-8"><header><p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-strong">Análise</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Relatórios</h1><p className="mt-2 text-muted">Consulte vendas, rentabilidade e posição atual do estoque.</p></header>
    <form className="grid gap-4 rounded-2xl border border-border bg-white p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end" method="get"><div><label className="mb-2 block text-sm font-semibold" htmlFor="inicio">Data inicial</label><input className="field" defaultValue={period.start} id="inicio" max={todayInSaoPaulo()} name="inicio" type="date" /></div><div><label className="mb-2 block text-sm font-semibold" htmlFor="fim">Data final</label><input className="field" defaultValue={period.end} id="fim" max={todayInSaoPaulo()} name="fim" type="date" /></div><button className="min-h-11 rounded-xl bg-foreground px-5 font-semibold text-white" type="submit">Aplicar período</button></form>
    {period.adjusted ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">O período informado era inválido; exibimos o mês atual.</p> : null}
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><MetricCard label="Receita" value={money.format(revenue)} detail={`${sales.length} vendas · ${units} peças`} /><MetricCard label="Custo das peças" value={money.format(cost)} /><MetricCard label="Lucro" value={money.format(grossProfit)} detail="Receita menos custo das peças" tone="positive" /></section>
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><MetricCard label="Ticket médio" value={money.format(averageTicket)} /><MetricCard label="Vendas canceladas" value={integer.format(cancelledCount)} /><MetricCard label="Estoque atual" value={`${integer.format(stockUnits)} peças`} /><MetricCard label="Valor do estoque" value={money.format(stockValue)} /></section>
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]"><section className="rounded-2xl border border-border bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold">Formas de pagamento</h2>{byPayment.size === 0 ? <p className="mt-4 text-sm text-muted">Sem vendas no período.</p> : <div className="mt-4 divide-y divide-border">{[...byPayment.entries()].sort((a, b) => b[1].revenue - a[1].revenue).map(([method, result]) => <div className="flex items-center justify-between gap-4 py-3" key={method}><div><p className="font-medium">{paymentLabels[method as keyof typeof paymentLabels]}</p><p className="text-sm text-muted">{result.count} vendas</p></div><strong>{money.format(result.revenue)}</strong></div>)}</div>}</section>
      <section className="rounded-2xl border border-border bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold">Desempenho por produto</h2>{products.length === 0 ? <p className="mt-4 text-sm text-muted">Sem produtos vendidos no período.</p> : <div className="mt-4 space-y-5">{products.map((product) => <article key={product.name}><div className="flex items-end justify-between gap-4"><div><p className="font-medium">{product.name}</p><p className="text-sm text-muted">{product.quantity} peças · lucro {money.format(product.revenue - product.cost)}</p></div><strong>{money.format(product.revenue)}</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(3, product.revenue / maxRevenue * 100)}%` }} /></div></article>)}</div>}</section></div>
  </div>;
}
