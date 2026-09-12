"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/features/auth/session";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/client";
import { rebuildInventory } from "@/features/stock/rebuild";
import { isFutureStoreDate } from "@/features/reports/period";
import { calculateSaleTotal, cancellationSchema, parseMoney, parseSaleItems, saleSchema, type SaleActionState } from "./validation";

async function saveSaleVersion(tx: Prisma.TransactionClient, data: ReturnType<typeof saleSchema.parse>, userId: string, replacesSaleId?: string) {
  const ids = data.items.map((item) => item.variantId);
  const available = await tx.productVariant.count({ where: { id: { in: ids }, active: true, product: { active: true } } });
  if (available !== ids.length) throw new Error("INVALID_VARIANT");
  const initialRevenue = calculateSaleTotal(data.items);
  return tx.sale.create({ data: {
    soldAt: new Date(`${data.soldOn}T18:00:00.000Z`), paymentMethod: data.paymentMethod,
    totalRevenue: initialRevenue.toFixed(2), totalCost: "0", totalGrossProfit: initialRevenue.toFixed(2), createdById: userId, replacesSaleId,
    items: { create: data.items.map((item) => {
      const lineRevenue = Math.round(item.quantity * parseMoney(item.unitSalePrice) * 100) / 100;
      return { productVariantId: item.variantId, quantity: item.quantity, unitSalePrice: parseMoney(item.unitSalePrice).toFixed(2), unitCostSnapshot: "0", lineRevenue: lineRevenue.toFixed(2), lineCost: "0", lineGrossProfit: lineRevenue.toFixed(2) };
    }) },
  } });
}

export async function createSale(_state: SaleActionState, formData: FormData): Promise<SaleActionState> {
  const user = await requireUser();
  const parsed = saleSchema.safeParse({ soldOn: formData.get("soldOn"), paymentMethod: formData.get("paymentMethod"), items: parseSaleItems(formData.get("items")) });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise os dados informados." };
  const soldAt = new Date(`${parsed.data.soldOn}T18:00:00.000Z`);
  if (isFutureStoreDate(parsed.data.soldOn)) return { error: "A data da venda não pode estar no futuro." };

  let saleId = "";
  try {
    await prisma.$transaction(async (tx) => {
      const ids = parsed.data.items.map((item) => item.variantId);
      const available = await tx.productVariant.count({ where: { id: { in: ids }, active: true, product: { active: true } } });
      if (available !== ids.length) throw new Error("INVALID_VARIANT");
      const initialRevenue = calculateSaleTotal(parsed.data.items);

      const sale = await tx.sale.create({
        data: {
          soldAt,
          paymentMethod: parsed.data.paymentMethod,
          totalRevenue: initialRevenue.toFixed(2),
          totalCost: "0",
          totalGrossProfit: initialRevenue.toFixed(2),
          createdById: user.id,
          items: {
            create: parsed.data.items.map((item) => {
              const lineRevenue = Math.round(item.quantity * parseMoney(item.unitSalePrice) * 100) / 100;
              return {
                productVariantId: item.variantId,
                quantity: item.quantity,
                unitSalePrice: parseMoney(item.unitSalePrice).toFixed(2),
                unitCostSnapshot: "0",
                lineRevenue: lineRevenue.toFixed(2),
                lineCost: "0",
                lineGrossProfit: lineRevenue.toFixed(2),
              };
            }),
          },
        },
      });
      saleId = sale.id;
      await rebuildInventory(tx);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_VARIANT") return { error: "Um dos produtos selecionados não está disponível." };
    if (error instanceof Error && error.message === "NEGATIVE_STOCK") return { error: "Não há estoque suficiente nessa data para concluir a venda." };
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2034") return { error: "O estoque mudou durante a venda. Tente salvar novamente." };
    console.error("Falha ao registrar venda", error);
    return { error: "Não foi possível registrar a venda." };
  }

  revalidatePath("/vendas");
  revalidatePath("/produtos");
  redirect(`/vendas/${saleId}?criada=1`);
}

export async function correctSale(saleId: string, _state: SaleActionState, formData: FormData): Promise<SaleActionState> {
  const user = await requireUser();
  const parsed = saleSchema.safeParse({ soldOn: formData.get("soldOn"), paymentMethod: formData.get("paymentMethod"), items: parseSaleItems(formData.get("items")) });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise os dados informados." };
  if (isFutureStoreDate(parsed.data.soldOn)) return { error: "A data da venda não pode estar no futuro." };
  let replacementId = "";
  try {
    await prisma.$transaction(async (tx) => {
      const original = await tx.sale.findUnique({ where: { id: saleId }, select: { status: true, replacement: { select: { id: true } } } });
      if (!original || original.status !== "COMPLETED" || original.replacement) throw new Error("NOT_EDITABLE");
      await tx.sale.update({ where: { id: saleId }, data: { status: "CANCELLED", cancelledAt: new Date(), cancelledById: user.id, cancellationReason: "Venda substituída por correção." } });
      const replacement = await saveSaleVersion(tx, parsed.data, user.id, saleId);
      replacementId = replacement.id;
      await rebuildInventory(tx);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_EDITABLE") return { error: "Esta venda não pode mais ser editada." };
    if (error instanceof Error && error.message === "INVALID_VARIANT") return { error: "Um dos produtos selecionados não está disponível." };
    if (error instanceof Error && error.message === "NEGATIVE_STOCK") return { error: "A edição deixaria o estoque negativo em algum momento do histórico." };
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2034") return { error: "O estoque mudou durante a edição. Tente novamente." };
    console.error("Falha ao editar venda", error);
    return { error: "Não foi possível editar a venda." };
  }
  revalidatePath("/vendas"); revalidatePath("/produtos"); revalidatePath("/entradas");
  redirect(`/vendas/${replacementId}?corrigida=1`);
}

export async function cancelSale(saleId: string, _state: SaleActionState, formData: FormData): Promise<SaleActionState> {
  const user = await requireUser();
  const parsed = cancellationSchema.safeParse({ reason: formData.get("reason") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  try {
    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({ where: { id: saleId }, select: { status: true, replacement: { select: { id: true } } } });
      if (!sale || sale.status !== "COMPLETED" || sale.replacement) throw new Error("NOT_CANCELLABLE");
      await tx.sale.update({ where: { id: saleId }, data: { status: "CANCELLED", cancelledAt: new Date(), cancelledById: user.id, cancellationReason: parsed.data.reason || null } });
      await rebuildInventory(tx);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_CANCELLABLE") return { error: "Esta venda não pode mais ser cancelada." };
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2034") return { error: "O estoque mudou durante o cancelamento. Tente novamente." };
    console.error("Falha ao cancelar venda", error);
    return { error: "Não foi possível cancelar a venda." };
  }
  revalidatePath("/vendas"); revalidatePath("/produtos"); revalidatePath("/entradas");
  redirect(`/vendas/${saleId}?cancelada=1`);
}

export async function deleteSale(saleId: string, _state: SaleActionState, formData: FormData): Promise<SaleActionState> {
  await requireUser();
  if (formData.get("confirmation") !== "on") return { error: "Confirme a exclusão definitiva da venda." };
  try {
    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({ where: { id: saleId }, select: { id: true } });
      if (!sale) throw new Error("NOT_FOUND");
      await tx.sale.updateMany({ where: { replacesSaleId: saleId }, data: { replacesSaleId: null } });
      await tx.saleItem.deleteMany({ where: { saleId } });
      await tx.sale.delete({ where: { id: saleId } });
      await rebuildInventory(tx);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") return { error: "Venda não encontrada." };
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2034") return { error: "O estoque mudou durante a exclusão. Tente novamente." };
    console.error("Falha ao excluir venda", error);
    return { error: "Não foi possível excluir a venda." };
  }
  revalidatePath("/vendas"); revalidatePath("/produtos"); revalidatePath("/entradas"); revalidatePath("/dashboard"); revalidatePath("/relatorios");
  redirect("/vendas?excluida=1");
}
