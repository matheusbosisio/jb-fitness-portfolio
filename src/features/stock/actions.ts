"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/features/auth/session";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/client";
import { rebuildInventory } from "./rebuild";
import { isFutureStoreDate } from "@/features/reports/period";
import { parseCost, parseEntryItems, stockEntrySchema, type StockEntryActionState } from "./validation";

async function saveEntryVersion(
  tx: Prisma.TransactionClient,
  data: ReturnType<typeof stockEntrySchema.parse>,
  userId: string,
  replacesEntryId?: string,
) {
  const ids = data.items.map((item) => item.variantId);
  const available = await tx.productVariant.count({ where: { id: { in: ids }, active: true, product: { active: true } } });
  if (available !== ids.length) throw new Error("INVALID_VARIANT");
  const entry = await tx.stockEntry.create({ data: { occurredAt: new Date(`${data.occurredOn}T12:00:00.000Z`), notes: data.notes || null, createdById: userId, replacesEntryId } });
  await tx.stockEntryItem.createMany({
    data: data.items.map((item) => ({ stockEntryId: entry.id, productVariantId: item.variantId, quantity: item.quantity, unitCost: parseCost(item.unitCost).toFixed(4), previousQuantity: 0, previousAverageCost: "0", resultingQuantity: 0, resultingAverageCost: "0" })),
  });
  return entry;
}

export async function createStockEntry(_state: StockEntryActionState, formData: FormData): Promise<StockEntryActionState> {
  const user = await requireUser();
  const parsed = stockEntrySchema.safeParse({ occurredOn: formData.get("occurredOn"), notes: formData.get("notes"), items: parseEntryItems(formData.get("items")) });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise os dados informados." };

  if (isFutureStoreDate(parsed.data.occurredOn)) return { error: "A data da entrada não pode estar no futuro." };

  try {
    await prisma.$transaction(async (tx) => {
      await saveEntryVersion(tx, parsed.data, user.id);
      await rebuildInventory(tx);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_VARIANT") return { error: "Um dos produtos selecionados não está disponível." };
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2034") return { error: "O estoque mudou durante o cadastro. Tente salvar novamente." };
    console.error("Falha ao registrar entrada", error);
    return { error: "Não foi possível registrar a entrada." };
  }

  revalidatePath("/entradas");
  revalidatePath("/produtos");
  redirect("/entradas?criada=1");
}

export async function correctStockEntry(entryId: string, _state: StockEntryActionState, formData: FormData): Promise<StockEntryActionState> {
  const user = await requireUser();
  const parsed = stockEntrySchema.safeParse({ occurredOn: formData.get("occurredOn"), notes: formData.get("notes"), items: parseEntryItems(formData.get("items")) });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revise os dados informados." };
  if (isFutureStoreDate(parsed.data.occurredOn)) return { error: "A data da entrada não pode estar no futuro." };

  let replacementId = "";
  try {
    await prisma.$transaction(async (tx) => {
      const original = await tx.stockEntry.findUnique({ where: { id: entryId }, select: { id: true, status: true, replacement: { select: { id: true } } } });
      if (!original || original.status !== "POSTED" || original.replacement) throw new Error("NOT_EDITABLE");
      await tx.stockEntry.update({ where: { id: entryId }, data: { status: "CORRECTED" } });
      const replacement = await saveEntryVersion(tx, parsed.data, user.id, entryId);
      replacementId = replacement.id;
      await rebuildInventory(tx);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_EDITABLE") return { error: "Esta entrada não pode mais ser corrigida." };
    if (error instanceof Error && error.message === "INVALID_VARIANT") return { error: "Um dos produtos selecionados não está disponível." };
    if (error instanceof Error && error.message === "NEGATIVE_STOCK") return { error: "A correção deixaria o estoque negativo em uma venda posterior." };
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2034") return { error: "O estoque mudou durante a correção. Tente novamente." };
    console.error("Falha ao corrigir entrada", error);
    return { error: "Não foi possível corrigir a entrada." };
  }

  revalidatePath("/entradas");
  revalidatePath("/produtos");
  redirect(`/entradas/${replacementId}?corrigida=1`);
}

export async function deleteStockEntry(entryId: string, _state: StockEntryActionState, formData: FormData): Promise<StockEntryActionState> {
  await requireUser();
  if (formData.get("confirmation") !== "on") return { error: "Confirme a exclusão definitiva da entrada." };
  try {
    await prisma.$transaction(async (tx) => {
      const entry = await tx.stockEntry.findUnique({ where: { id: entryId }, select: { id: true } });
      if (!entry) throw new Error("NOT_FOUND");
      await tx.stockEntry.updateMany({ where: { replacesEntryId: entryId }, data: { replacesEntryId: null } });
      await tx.stockEntryItem.deleteMany({ where: { stockEntryId: entryId } });
      await tx.stockEntry.delete({ where: { id: entryId } });
      await rebuildInventory(tx);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") return { error: "Entrada não encontrada." };
    if (error instanceof Error && error.message === "NEGATIVE_STOCK") return { error: "Esta entrada sustenta vendas posteriores. Exclua ou corrija essas vendas primeiro." };
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2034") return { error: "O estoque mudou durante a exclusão. Tente novamente." };
    console.error("Falha ao excluir entrada", error);
    return { error: "Não foi possível excluir a entrada." };
  }
  revalidatePath("/entradas"); revalidatePath("/produtos"); revalidatePath("/dashboard"); revalidatePath("/relatorios");
  redirect("/entradas?excluida=1");
}
