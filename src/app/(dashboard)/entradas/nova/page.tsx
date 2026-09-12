import Link from "next/link";

import { requireUser } from "@/features/auth/session";
import { StockEntryForm } from "@/features/stock/entry-form";
import { prisma } from "@/server/db/client";

const sizeLabels = { NO_SIZE: "sem tamanho", P: "P", M: "M", G: "G", GG: "GG" };

export default async function NewStockEntryPage() {
  await requireUser();
  const variants = await prisma.productVariant.findMany({ where: { active: true, product: { active: true } }, include: { product: { select: { name: true } } }, orderBy: [{ product: { name: "asc" } }, { color: "asc" }, { size: "asc" }] });
  const options = variants.map((variant) => ({ id: variant.id, label: `${variant.product.name} — ${variant.color || "sem cor"}, ${sizeLabels[variant.size]}` }));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

  return (
    <div className="space-y-8">
      <header><Link className="text-sm font-semibold text-brand-strong hover:underline" href="/entradas">← Voltar às entradas</Link><h1 className="mt-4 text-3xl font-semibold tracking-tight">Nova entrada</h1><p className="mt-2 text-muted">Registre uma compra ou o estoque inicial da loja.</p></header>
      {options.length === 0 ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Cadastre um produto com variações antes de registrar uma entrada.</p> : null}
      <StockEntryForm today={today} variants={options} />
    </div>
  );
}
