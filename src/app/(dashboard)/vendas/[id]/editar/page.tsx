import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/features/auth/session";
import { correctSale } from "@/features/sales/actions";
import { SaleForm } from "@/features/sales/sale-form";
import { prisma } from "@/server/db/client";

type Props = { params: Promise<{ id: string }> };
const sizeLabels = { NO_SIZE: "sem tamanho", P: "P", M: "M", G: "G", GG: "GG" };

export default async function EditSalePage({ params }: Props) {
  await requireUser();
  const { id } = await params;
  const [sale, variants] = await Promise.all([
    prisma.sale.findUnique({ where: { id }, include: { replacement: { select: { id: true } }, items: true } }),
    prisma.productVariant.findMany({ where: { active: true, product: { active: true } }, include: { product: { select: { name: true, salePrice: true } } }, orderBy: [{ product: { name: "asc" } }, { color: "asc" }, { size: "asc" }] }),
  ]);
  if (!sale || sale.status !== "COMPLETED" || sale.replacement) notFound();
  const variantsForForm = variants.map((variant) => ({ id: variant.id, label: `${variant.product.name} — ${variant.color || "sem cor"}, ${sizeLabels[variant.size]}`, stockQuantity: variant.stockQuantity, salePrice: Number(variant.product.salePrice).toFixed(2) }));
  const initial = { soldOn: sale.soldAt.toISOString().slice(0, 10), paymentMethod: sale.paymentMethod, items: sale.items.map((item) => ({ variantId: item.productVariantId, quantity: item.quantity, unitSalePrice: Number(item.unitSalePrice).toFixed(2).replace(".", ",") })) };
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  return <div className="space-y-8"><header><Link className="text-sm font-semibold text-brand-strong hover:underline" href={`/vendas/${id}`}>← Voltar aos detalhes</Link><h1 className="mt-4 text-3xl font-semibold tracking-tight">Editar venda</h1><p className="mt-2 max-w-2xl text-muted">A versão anterior será preservada e todos os saldos posteriores serão recalculados.</p></header><SaleForm action={correctSale.bind(null, id)} initial={initial} today={today} variants={variantsForForm} /></div>;
}
