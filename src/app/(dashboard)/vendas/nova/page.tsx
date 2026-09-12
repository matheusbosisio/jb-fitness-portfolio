import Link from "next/link";

import { requireUser } from "@/features/auth/session";
import { SaleForm } from "@/features/sales/sale-form";
import { prisma } from "@/server/db/client";

const sizeLabels = { NO_SIZE: "sem tamanho", P: "P", M: "M", G: "G", GG: "GG" };

export default async function NewSalePage() {
  await requireUser();
  const variants = await prisma.productVariant.findMany({ where: { active: true, stockQuantity: { gt: 0 }, product: { active: true } }, include: { product: { select: { name: true, salePrice: true } } }, orderBy: [{ product: { name: "asc" } }, { color: "asc" }, { size: "asc" }] });
  const options = variants.map((variant) => ({ id: variant.id, label: `${variant.product.name} — ${variant.color || "sem cor"}, ${sizeLabels[variant.size]}`, stockQuantity: variant.stockQuantity, salePrice: Number(variant.product.salePrice).toFixed(2) }));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  return <div className="space-y-8"><header><Link className="text-sm font-semibold text-brand-strong hover:underline" href="/vendas">← Voltar às vendas</Link><h1 className="mt-4 text-3xl font-semibold tracking-tight">Nova venda</h1><p className="mt-2 text-muted">Selecione as peças e confirme o valor recebido.</p></header>{options.length === 0 ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Não há peças disponíveis. Registre uma entrada de estoque antes de vender.</p> : null}<SaleForm today={today} variants={options} /></div>;
}
