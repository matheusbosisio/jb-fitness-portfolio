import { requireUser } from "@/features/auth/session";
import { prisma } from "@/server/db/client";

type Props = { searchParams: Promise<{ restaurado?: string; erro?: string }> };

export default async function BackupPage({ searchParams }: Props) {
  await requireUser();
  const { restaurado, erro } = await searchParams;
  const [products, entries, sales] = await Promise.all([
    prisma.product.count(), prisma.stockEntry.count(), prisma.sale.count(),
  ]);

  return <div className="space-y-8">
    <header><p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-strong">Segurança</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Backup dos dados</h1><p className="mt-2 text-muted">Guarde uma cópia do catálogo, estoque, entradas e vendas.</p></header>
    {restaurado === "1" ? <p className="rounded-xl bg-green-50 p-4 text-sm text-green-800" role="status">Backup restaurado com sucesso.</p> : null}
    {erro === "1" ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">Não foi possível restaurar. Confira o arquivo e digite a confirmação exatamente como solicitado.</p> : null}
    <section className="rounded-2xl border border-border bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold">Baixar uma cópia</h2><p className="mt-2 text-sm text-muted">A cópia atual contém {products} produtos, {entries} entradas e {sales} vendas. A conta e a senha não são incluídas.</p><a className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-strong px-5 font-semibold text-white sm:w-auto" download href="/api/backup">Baixar backup agora</a><p className="mt-3 text-xs text-muted">Recomendação: baixe uma cópia toda semana e guarde-a em dois lugares diferentes.</p></section>
    <section className="rounded-2xl border border-red-200 bg-white p-5 sm:p-6"><h2 className="text-lg font-semibold text-red-800">Restaurar uma cópia</h2><p className="mt-2 text-sm text-muted">A restauração substitui todo o catálogo, estoque, entradas e vendas atuais pelos dados do arquivo. Sua conta continuará a mesma.</p><form action="/api/restore" className="mt-5 grid max-w-xl gap-4" encType="multipart/form-data" method="post"><div><label className="mb-2 block text-sm font-semibold" htmlFor="backup">Arquivo de backup</label><input accept="application/json,.json" className="block w-full text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-background file:px-4 file:py-3 file:font-semibold" id="backup" name="backup" required type="file" /></div><div><label className="mb-2 block text-sm font-semibold" htmlFor="confirmation">Digite RESTAURAR para confirmar</label><input autoComplete="off" className="field" id="confirmation" name="confirmation" pattern="RESTAURAR" required /></div><button className="min-h-12 w-full rounded-xl bg-red-700 px-5 font-semibold text-white sm:w-auto" type="submit">Restaurar este backup</button></form></section>
    <p className="text-xs text-muted">O backup preserva as referências das fotos armazenadas online. Imagens usadas somente no ambiente local não são incorporadas ao arquivo.</p>
  </div>;
}
