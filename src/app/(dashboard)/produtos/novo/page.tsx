import Link from "next/link";

import { requireUser } from "@/features/auth/session";
import { ProductForm } from "@/features/catalog/product-form";
import { prisma } from "@/server/db/client";

export default async function NewProductPage() {
  await requireUser();
  const categories = await prisma.category.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });

  return (
    <div className="space-y-8">
      <header><Link className="text-sm font-semibold text-brand-strong hover:underline" href="/produtos">← Voltar aos produtos</Link><h1 className="mt-4 text-3xl font-semibold tracking-tight">Novo produto</h1><p className="mt-2 text-muted">Cadastre o modelo e todas as combinações que serão vendidas.</p></header>
      {categories.length === 0 ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Crie ao menos uma categoria na página de produtos antes de continuar.</p> : null}
      <ProductForm categories={categories} />
    </div>
  );
}
