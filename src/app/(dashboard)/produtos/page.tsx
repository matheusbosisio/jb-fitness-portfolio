import Link from "next/link";
import Image from "next/image";

import { CategoryForm } from "@/features/catalog/category-form";
import { productImageUrl } from "@/features/catalog/image-key";
import { requireUser } from "@/features/auth/session";
import { prisma } from "@/server/db/client";

type Props = { searchParams: Promise<{ busca?: string; criado?: string; atualizado?: string; excluido?: string; status?: string }> };

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function ProductsPage({ searchParams }: Props) {
  await requireUser();
  const { busca = "", criado, atualizado, excluido, status } = await searchParams;
  const query = busca.trim();
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: query ? { name: { contains: query, mode: "insensitive" } } : undefined,
      include: { category: { select: { name: true } }, variants: { select: { stockQuantity: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-strong">Catálogo</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Produtos</h1><p className="mt-2 text-muted">Organize modelos, preços e variações.</p></div>
        <Link className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-strong px-5 font-semibold text-white sm:w-auto" href="/produtos/novo">Novo produto</Link>
      </header>

      {criado === "1" ? <p className="rounded-xl bg-green-50 p-4 text-sm text-green-800" role="status">Produto cadastrado com sucesso.</p> : null}
      {atualizado === "1" ? <p className="rounded-xl bg-green-50 p-4 text-sm text-green-800" role="status">Produto atualizado com sucesso.</p> : null}
      {excluido === "1" ? <p className="rounded-xl bg-green-50 p-4 text-sm text-green-800" role="status">Produto excluído com sucesso.</p> : null}
      {status ? <p className="rounded-xl bg-green-50 p-4 text-sm text-green-800" role="status">Produto {status === "ativo" ? "reativado" : "desativado"} com sucesso.</p> : null}

      <section className="rounded-2xl border border-border bg-white p-5 sm:p-6">
        <h2 className="font-semibold">Categorias</h2>
        <p className="mt-1 text-sm text-muted">As categorias iniciais já estão prontas; adicione outras quando precisar.</p>
        <div className="mt-4 flex flex-wrap gap-2">{categories.map((category) => <span className="rounded-full bg-background px-3 py-1.5 text-sm" key={category.id}>{category.name}</span>)}</div>
        <CategoryForm />
      </section>

      <section>
        <form className="mb-5 grid gap-3 sm:flex" role="search">
          <label className="sr-only" htmlFor="busca">Buscar produtos</label>
          <input className="field max-w-md" defaultValue={query} id="busca" name="busca" placeholder="Buscar pelo nome" />
          <button className="min-h-11 rounded-xl border border-border bg-white px-5 font-semibold hover:border-brand" type="submit">Buscar</button>
        </form>
        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center"><h2 className="font-semibold">{query ? "Nenhum produto encontrado" : "Seu catálogo está vazio"}</h2><p className="mt-2 text-sm text-muted">{query ? "Tente buscar por outro nome." : "Cadastre o primeiro produto para começar."}</p></div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-white">
            <div className="hidden grid-cols-[1fr_170px_130px_100px_90px] gap-4 border-b border-border bg-background px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted sm:grid"><span>Produto</span><span>Categoria</span><span>Preço</span><span>Estoque</span><span></span></div>
            {products.map((product) => {
              const stock = product.variants.reduce((total, variant) => total + variant.stockQuantity, 0);
              const imageUrl = productImageUrl(product.imageKey);
              return <article className={`grid gap-3 border-b border-border px-4 py-4 last:border-0 sm:grid-cols-[1fr_170px_130px_100px_90px] sm:items-center sm:gap-4 sm:px-5 ${product.active ? "" : "bg-background/70 text-muted"}`} key={product.id}><div className="flex items-center gap-3">{imageUrl ? <Image alt={`Foto de ${product.name}`} className="h-14 w-14 shrink-0 rounded-lg object-cover" height={56} src={imageUrl} width={56} /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-background text-[10px] text-muted">Sem foto</div>}<div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{product.name}</h2>{!product.active ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Inativo</span> : null}</div><p className="text-sm text-muted">{product.variants.length} {product.variants.length === 1 ? "variação" : "variações"}</p></div></div><p className="flex justify-between gap-3 text-sm sm:block"><span className="font-medium text-muted sm:hidden">Categoria</span>{product.category.name}</p><p className="flex justify-between gap-3 font-medium sm:block"><span className="font-medium text-muted sm:hidden">Preço</span>{money.format(Number(product.salePrice))}</p><p className="flex justify-between gap-3 text-sm font-medium sm:block"><span className="font-medium text-muted sm:hidden">Estoque</span>{stock} peças</p><Link className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border text-sm font-semibold text-brand-strong hover:border-brand sm:min-h-0 sm:justify-start sm:border-0" href={`/produtos/${product.id}/editar`}>Editar</Link></article>;
            })}
          </div>
        )}
      </section>
    </div>
  );
}
