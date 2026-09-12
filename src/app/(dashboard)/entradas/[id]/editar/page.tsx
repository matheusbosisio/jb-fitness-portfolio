import Link from "next/link";
import { notFound } from "next/navigation";

import { requireUser } from "@/features/auth/session";
import { correctStockEntry } from "@/features/stock/actions";
import { StockEntryForm } from "@/features/stock/entry-form";
import { prisma } from "@/server/db/client";

type Props = { params: Promise<{ id: string }> };
const sizeLabels = { NO_SIZE: "sem tamanho", P: "P", M: "M", G: "G", GG: "GG" };

export default async function EditStockEntryPage({ params }: Props) {
  await requireUser();
  const { id } = await params;
  const [entry, variants] = await Promise.all([
    prisma.stockEntry.findUnique({ where: { id }, include: { replacement: { select: { id: true } }, items: true } }),
    prisma.productVariant.findMany({ where: { active: true, product: { active: true } }, include: { product: { select: { name: true } } }, orderBy: [{ product: { name: "asc" } }, { color: "asc" }, { size: "asc" }] }),
  ]);
  if (!entry || entry.status !== "POSTED" || entry.replacement) notFound();
  const options = variants.map((variant) => ({ id: variant.id, label: `${variant.product.name} — ${variant.color || "sem cor"}, ${sizeLabels[variant.size]}` }));
  const initial = { occurredOn: entry.occurredAt.toISOString().slice(0, 10), notes: entry.notes ?? "", items: entry.items.map((item) => ({ variantId: item.productVariantId, quantity: item.quantity, unitCost: Number(item.unitCost).toFixed(2).replace(".", ",") })) };
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const action = correctStockEntry.bind(null, id);

  return <div className="space-y-8"><header><Link className="text-sm font-semibold text-brand-strong hover:underline" href={`/entradas/${id}`}>← Voltar aos detalhes</Link><h1 className="mt-4 text-3xl font-semibold tracking-tight">Corrigir entrada</h1><p className="mt-2 max-w-2xl text-muted">A versão anterior será preservada e todo o histórico posterior será recalculado.</p></header><StockEntryForm action={action} initial={initial} today={today} variants={options} /></div>;
}
