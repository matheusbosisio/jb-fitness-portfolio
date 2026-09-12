import Link from "next/link";
import { notFound } from "next/navigation";

import { requireUser } from "@/features/auth/session";
import { toggleProductStatus, updateProduct } from "@/features/catalog/actions";
import { ProductForm } from "@/features/catalog/product-form";
import { DeleteProductForm } from "@/features/catalog/delete-product-form";
import { prisma } from "@/server/db/client";

type Props = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Props) {
  await requireUser();
  const { id } = await params;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { variants: { orderBy: [{ active: "desc" }, { color: "asc" }, { size: "asc" }] } },
    }),
    prisma.category.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!product) notFound();

  const updateAction = updateProduct.bind(null, product.id);
  const statusAction = toggleProductStatus.bind(null, product.id);
  const initial = {
    name: product.name,
    categoryId: product.categoryId,
    description: product.description ?? "",
    salePrice: Number(product.salePrice).toFixed(2).replace(".", ","),
    imageKey: product.imageKey,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      color: variant.color ?? "",
      size: variant.size,
      active: variant.active,
    })),
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><Link className="text-sm font-semibold text-brand-strong hover:underline" href="/produtos">← Voltar aos produtos</Link><h1 className="mt-4 text-3xl font-semibold tracking-tight">Editar produto</h1><p className="mt-2 text-muted">Atualize os dados sem perder o histórico de estoque e vendas.</p></div>
        <form action={statusAction} className="w-full sm:w-auto"><button className={`min-h-11 w-full rounded-xl border px-4 text-sm font-semibold ${product.active ? "border-red-200 text-red-700" : "border-green-200 text-green-800"}`} type="submit">{product.active ? "Desativar produto" : "Reativar produto"}</button></form>
      </header>
      {!product.active ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900" role="status">Este produto está inativo e não aparece em novas entradas ou vendas. O histórico continua preservado.</p> : null}
      <ProductForm action={updateAction} categories={categories} initial={initial} />
      <DeleteProductForm productId={product.id} />
    </div>
  );
}
