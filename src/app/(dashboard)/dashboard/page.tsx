import Link from "next/link";
import { requireUser } from "@/features/auth/session";
import { date, integer, money, paymentLabels } from "@/features/reports/format";
import { DailySalesChart } from "@/features/reports/daily-sales-chart";
import { buildDailySalesSeries } from "@/features/reports/daily-sales-series";
import { calculateInventoryMetrics } from "@/features/reports/inventory-metrics";
import { MetricCard } from "@/features/reports/metric-card";
import { currentMonthPeriod, parseReportPeriod, todayInSaoPaulo } from "@/features/reports/period";
import { prisma } from "@/server/db/client";

export default async function DashboardPage() {
  const user = await requireUser();
  const selected = currentMonthPeriod();
  const period = parseReportPeriod(selected.start, selected.end);
  const today = todayInSaoPaulo();
  const todayPeriod = parseReportPeriod(today, today);
  const chartFrom = new Date(todayPeriod.from.getTime() - 6 * 86_400_000);
  const saleFilter = { status: "COMPLETED" as const, soldAt: { gte: period.from, lt: period.until } };
  const todaySaleFilter = { status: "COMPLETED" as const, soldAt: { gte: todayPeriod.from, lt: todayPeriod.until } };
  const [salesSummary, todaySummary, unitsSold, todayUnitsSold, variants, productCount, recentSales, chartSales] = await Promise.all([
    prisma.sale.aggregate({ where: saleFilter, _sum: { totalRevenue: true, totalCost: true, totalGrossProfit: true }, _count: true }),
    prisma.sale.aggregate({ where: todaySaleFilter, _sum: { totalRevenue: true, totalGrossProfit: true }, _count: true }),
    prisma.saleItem.aggregate({ where: { sale: saleFilter }, _sum: { quantity: true } }),
    prisma.saleItem.aggregate({ where: { sale: todaySaleFilter }, _sum: { quantity: true } }),
    prisma.productVariant.findMany({ where: { active: true, product: { active: true } }, select: { id: true, stockQuantity: true, averageUnitCost: true, color: true, size: true, product: { select: { name: true, salePrice: true } } }, orderBy: { stockQuantity: "asc" } }),
    prisma.product.count({ where: { active: true } }),
    prisma.sale.findMany({ where: { status: "COMPLETED" }, select: { id: true, soldAt: true, paymentMethod: true, totalRevenue: true }, orderBy: [{ soldAt: "desc" }, { createdAt: "desc" }], take: 5 }),
    prisma.sale.findMany({ where: { status: "COMPLETED", soldAt: { gte: chartFrom, lt: todayPeriod.until } }, select: { soldAt: true, totalRevenue: true, totalGrossProfit: true } }),
  ]);
  const revenue = Number(salesSummary._sum.totalRevenue ?? 0);
  const profit = Number(salesSummary._sum.totalGrossProfit ?? 0);
  const todayRevenue = Number(todaySummary._sum.totalRevenue ?? 0);
  const todayProfit = Number(todaySummary._sum.totalGrossProfit ?? 0);
  const inventory = calculateInventoryMetrics(variants.map((variant) => ({ quantity: variant.stockQuantity, averageUnitCost: Number(variant.averageUnitCost), salePrice: Number(variant.product.salePrice) })));
  const lowStock = variants.filter((variant) => variant.stockQuantity <= 3).slice(0, 6);
  const dailySales = buildDailySalesSeries(chartSales.map((sale) => ({ soldAt: sale.soldAt, revenue: Number(sale.totalRevenue), profit: Number(sale.totalGrossProfit) })), today);

  return <div className="space-y-8"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-strong">Visão geral</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Bem-vinda, {user.name}</h1><p className="mt-2 text-muted">Resultados realizados e potencial do estoque atual.</p></div><Link className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border bg-white px-4 text-sm font-semibold text-brand-strong hover:border-brand sm:w-auto sm:border-0 sm:bg-transparent sm:px-0" href={`/relatorios?inicio=${period.start}&fim=${period.end}`}>Ver relatório completo →</Link></header>
    <section aria-labelledby="resultados-hoje"><h2 className="mb-4 text-lg font-semibold" id="resultados-hoje">Hoje</h2><div className="grid gap-4 sm:grid-cols-2"><MetricCard label="Vendas de hoje" value={money.format(todayRevenue)} detail={`${todaySummary._count} vendas · ${todayUnitsSold._sum.quantity ?? 0} peças`} /><MetricCard label="Lucro de hoje" value={money.format(todayProfit)} detail="Receita menos custo das peças" tone="positive" /></div></section>
    <section aria-labelledby="resultados-mes"><h2 className="mb-4 text-lg font-semibold" id="resultados-mes">Mês atual</h2><div className="grid gap-4 sm:grid-cols-2"><MetricCard label="Vendas no mês" value={money.format(revenue)} detail={`${salesSummary._count} vendas · ${unitsSold._sum.quantity ?? 0} peças`} /><MetricCard label="Lucro no mês" value={money.format(profit)} detail="Receita menos custo das peças" tone="positive" /></div></section>
    <section aria-labelledby="situacao-estoque"><div className="mb-4"><h2 className="text-lg font-semibold" id="situacao-estoque">Situação do estoque</h2><p className="mt-1 text-sm text-muted">Os valores potenciais consideram a venda de todas as peças pelo preço cadastrado.</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><MetricCard label="Estoque disponível" value={`${integer.format(inventory.units)} peças`} detail={`${productCount} produtos ativos`} /><MetricCard label="Custo atual do estoque" value={money.format(inventory.costValue)} detail="Quantidade × custo médio" /><MetricCard label="Faturamento potencial" value={money.format(inventory.potentialRevenue)} detail="Quantidade × preço cadastrado" /><MetricCard label="Lucro potencial" value={money.format(inventory.potentialProfit)} detail="Faturamento potencial menos custo atual" tone="positive" /></div></section>
    <DailySalesChart points={dailySales} />
    <div className="grid gap-6 lg:grid-cols-2"><section className="rounded-2xl border border-border bg-white p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Estoque baixo</h2><Link className="text-sm font-semibold text-brand-strong" href="/produtos">Ver produtos</Link></div>{lowStock.length === 0 ? <p className="mt-5 text-sm text-muted">Nenhuma variação com 3 peças ou menos.</p> : <div className="mt-4 divide-y divide-border">{lowStock.map((variant) => <div className="flex items-center justify-between gap-4 py-3" key={variant.id}><div><p className="font-medium">{variant.product.name}</p><p className="text-sm text-muted">{variant.color || "sem cor"} · {variant.size === "NO_SIZE" ? "sem tamanho" : variant.size}</p></div><span className={`rounded-full px-3 py-1 text-sm font-semibold ${variant.stockQuantity === 0 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>{variant.stockQuantity}</span></div>)}</div>}</section>
      <section className="rounded-2xl border border-border bg-white p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Vendas recentes</h2><Link className="text-sm font-semibold text-brand-strong" href="/vendas">Ver todas</Link></div>{recentSales.length === 0 ? <p className="mt-5 text-sm text-muted">Nenhuma venda concluída.</p> : <div className="mt-4 divide-y divide-border">{recentSales.map((sale) => <Link className="flex items-center justify-between gap-4 py-3 hover:text-brand-strong" href={`/vendas/${sale.id}`} key={sale.id}><div><p className="font-medium">{date.format(sale.soldAt)}</p><p className="text-sm text-muted">{paymentLabels[sale.paymentMethod]}</p></div><strong>{money.format(Number(sale.totalRevenue))}</strong></Link>)}</div>}</section></div>
  </div>;
}
