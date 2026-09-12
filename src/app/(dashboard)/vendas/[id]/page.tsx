import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/features/auth/session";
import { CancelSaleForm } from "@/features/sales/cancel-sale-form";
import { deleteSale } from "@/features/sales/actions";
import { PermanentDeleteForm } from "@/features/shared/permanent-delete-form";
import { prisma } from "@/server/db/client";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ criada?: string; corrigida?: string; cancelada?: string }> };
const date = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const sizeLabels = { NO_SIZE: "sem tamanho", P: "P", M: "M", G: "G", GG: "GG" };
const paymentLabels = { PIX: "Pix", CASH: "Dinheiro", DEBIT_CARD: "Cartão de débito", CREDIT_CARD: "Cartão de crédito" };

export default async function SaleDetailsPage({ params, searchParams }: Props) {
  await requireUser();
  const [{ id }, messages] = await Promise.all([params, searchParams]);
  const sale = await prisma.sale.findUnique({ where: { id }, include: { replacement: { select: { id: true } }, replacesSale: { select: { id: true } }, items: { include: { productVariant: { include: { product: { select: { name: true, salePrice: true } } } } } } } });
  if (!sale) notFound();
  const editable = sale.status === "COMPLETED" && !sale.replacement;
  return <div className="space-y-8">
    <header><Link className="text-sm font-semibold text-brand-strong hover:underline" href="/vendas">← Voltar às vendas</Link><div className="mt-4 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-strong">Venda de {date.format(sale.soldAt)}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{paymentLabels[sale.paymentMethod]}</h1></div>{editable ? <Link className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border bg-white px-5 font-semibold hover:border-brand sm:w-auto" href={`/vendas/${sale.id}/editar`}>Editar venda</Link> : null}</div></header>
    {messages.criada === "1" ? <p className="rounded-xl bg-green-50 p-4 text-sm text-green-800" role="status">Venda concluída e estoque atualizado.</p> : null}{messages.corrigida === "1" ? <p className="rounded-xl bg-green-50 p-4 text-sm text-green-800" role="status">Venda corrigida e histórico recalculado.</p> : null}{messages.cancelada === "1" ? <p className="rounded-xl bg-green-50 p-4 text-sm text-green-800" role="status">Venda cancelada e peças devolvidas ao estoque.</p> : null}
    {sale.status === "CANCELLED" ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{sale.replacement ? <>Esta versão foi substituída. <Link className="font-semibold underline" href={`/vendas/${sale.replacement.id}`}>Ver versão atual.</Link></> : <>Venda cancelada{sale.cancellationReason ? `: ${sale.cancellationReason}` : "."}</>}</p> : sale.replacesSale ? <p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">Esta é uma versão corrigida. <Link className="font-semibold underline" href={`/vendas/${sale.replacesSale.id}`}>Ver versão anterior.</Link></p> : null}
    <section className="overflow-hidden rounded-2xl border border-border bg-white"><div className="grid grid-cols-[minmax(0,1fr)_48px_88px] gap-2 border-b border-border bg-background px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:grid-cols-[1fr_90px_140px_140px] sm:gap-3 sm:px-5"><span>Produto</span><span>Qtd.</span><span>Preço</span><span className="hidden sm:block">Lucro</span></div>{sale.items.map((item) => <div className="grid grid-cols-[minmax(0,1fr)_48px_88px] gap-2 border-b border-border px-4 py-4 last:border-0 sm:grid-cols-[1fr_90px_140px_140px] sm:gap-3 sm:px-5" key={item.id}><div className="min-w-0"><p className="font-semibold">{item.productVariant.product.name}</p><p className="text-sm text-muted">{item.productVariant.color || "sem cor"}, {sizeLabels[item.productVariant.size]} · cadastrado {money.format(Number(item.productVariant.product.salePrice))}</p></div><p>{item.quantity}</p><p>{money.format(Number(item.unitSalePrice))}</p><p className="hidden text-green-700 sm:block">{money.format(Number(item.lineGrossProfit))}</p></div>)}<div className="grid gap-2 bg-background px-4 py-4 text-right sm:px-5"><p>Receita: <strong>{money.format(Number(sale.totalRevenue))}</strong></p><p>Custo: <strong>{money.format(Number(sale.totalCost))}</strong></p><p className="text-lg text-green-700">Lucro: <strong>{money.format(Number(sale.totalGrossProfit))}</strong></p></div></section>
    {editable ? <CancelSaleForm saleId={sale.id} /> : null}
    <PermanentDeleteForm action={deleteSale.bind(null, sale.id)} buttonLabel="Excluir venda" description="Use esta opção para apagar lançamentos de teste ou feitos por engano. A venda desaparecerá do histórico e o estoque será recalculado." title="Excluir venda definitivamente" />
  </div>;
}
