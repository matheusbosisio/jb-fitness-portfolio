import { money } from "./format";
import type { DailySalesPoint } from "./daily-sales-series";

export function DailySalesChart({ points }: { points: DailySalesPoint[] }) {
  const maximum = Math.max(...points.flatMap((point) => [point.revenue, point.profit]), 1);

  return (
    <section className="rounded-2xl border border-border bg-white p-5 sm:p-6" aria-labelledby="evolucao-vendas">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold" id="evolucao-vendas">Vendas nos últimos 7 dias</h2><p className="mt-1 text-sm text-muted">Receita e lucro realizados por dia.</p></div>
        <div className="flex gap-4 text-xs text-muted"><span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-brand-strong" />Receita</span><span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-green-600" />Lucro</span></div>
      </div>
      <div className="mt-6 grid h-52 grid-cols-7 items-end gap-2 border-b border-border sm:gap-4">
        {points.map((point) => (
          <div className="flex h-full min-w-0 flex-col justify-end" key={point.date} title={`${point.label}: receita ${money.format(point.revenue)}; lucro ${money.format(point.profit)}`}>
            <div className="flex h-[168px] items-end justify-center gap-1" aria-label={`${point.label}: receita ${money.format(point.revenue)}; lucro ${money.format(point.profit)}`}>
              <div className="w-full max-w-5 rounded-t bg-brand-strong" style={{ height: `${point.revenue === 0 ? 2 : Math.max(6, point.revenue / maximum * 100)}%` }} />
              <div className="w-full max-w-5 rounded-t bg-green-600" style={{ height: `${point.profit === 0 ? 2 : Math.max(6, point.profit / maximum * 100)}%` }} />
            </div>
            <span className="mt-2 truncate text-center text-[11px] text-muted sm:text-xs">{point.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
