import Link from "next/link";
import { notFound } from "next/navigation";

import { requireUser } from "@/features/auth/session";
import { deleteStockEntry } from "@/features/stock/actions";
import { PermanentDeleteForm } from "@/features/shared/permanent-delete-form";
import { prisma } from "@/server/db/client";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ corrigida?: string }> };
const date = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const sizeLabels = { NO_SIZE: "sem tamanho", P: "P", M: "M", G: "G", GG: "GG" };

export default async function StockEntryDetailsPage({ params, searchParams }: Props) {
  await requireUser();
  const [{ id }, { corrigida }] = await Promise.all([params, searchParams]);
  const entry = await prisma.stockEntry.findUnique({ where: { id }, include: { replacement: { select: { id: true } }, replacesEntry: { select: { id: true } }, items: { include: { productVariant: { include: { product: { select: { name: true } } } } } } } });
  if (!entry) notFound();
  const total = entry.items.reduce((sum, item) => sum + item.quantity * Number(item.unitCost), 0);

  return <div className="space-y-8"><header><Link className="text-sm font-semibold text-brand-strong hover:underline" href="/entradas">← Voltar às entradas</Link><div className="mt-4 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-strong">Entrada de {date.format(entry.occurredAt)}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{entry.notes || "Entrada sem observação"}</h1></div>{entry.status === "POSTED" && !entry.replacement ? <Link className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border bg-white px-5 font-semibold hover:border-brand sm:w-auto" href={`/entradas/${entry.id}/editar`}>Corrigir entrada</Link> : null}</div></header>{corrigida === "1" ? <p className="rounded-xl bg-green-50 p-4 text-sm text-green-800" role="status">Correção salva e histórico de estoque recalculado.</p> : null}{entry.status === "CORRECTED" ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Esta versão foi corrigida.{entry.replacement ? <> <Link className="font-semibold underline" href={`/entradas/${entry.replacement.id}`}>Ver versão atual.</Link></> : null}</p> : entry.replacesEntry ? <p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">Esta é uma versão corrigida. <Link className="font-semibold underline" href={`/entradas/${entry.replacesEntry.id}`}>Ver versão anterior.</Link></p> : null}<section className="overflow-hidden rounded-2xl border border-border bg-white"><div className="grid grid-cols-[minmax(0,1fr)_52px_88px] gap-2 border-b border-border bg-background px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:grid-cols-[1fr_90px_130px] sm:gap-3 sm:px-5"><span>Produto</span><span>Qtd.</span><span>Custo</span></div>{entry.items.map((item) => <div className="grid grid-cols-[minmax(0,1fr)_52px_88px] gap-2 border-b border-border px-4 py-4 last:border-0 sm:grid-cols-[1fr_90px_130px] sm:gap-3 sm:px-5" key={item.id}><div className="min-w-0"><p className="font-semibold">{item.productVariant.product.name}</p><p className="text-sm text-muted">{item.productVariant.color || "sem cor"}, {sizeLabels[item.productVariant.size]}</p></div><p>{item.quantity}</p><p>{money.format(Number(item.unitCost))}</p></div>)}<div className="flex justify-end bg-background px-4 py-4 text-right font-semibold sm:px-5">Investimento: {money.format(total)}</div></section><PermanentDeleteForm action={deleteStockEntry.bind(null, entry.id)} buttonLabel="Excluir entrada" description="Use esta opção para apagar uma entrada de teste ou lançada por engano. O estoque e os custos posteriores serão recalculados; a exclusão será recusada se deixar alguma venda sem estoque." title="Excluir entrada definitivamente" /></div>;
}
