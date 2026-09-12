import type { Prisma } from "@/generated/prisma/client";
import { calculateWeightedAverage } from "./validation";

type Balance = { quantity: number; averageCost: number };

export async function rebuildInventory(tx: Prisma.TransactionClient) {
  const [entries, sales, variants] = await Promise.all([
    tx.stockEntry.findMany({ where: { status: "POSTED" }, include: { items: true }, orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }] }),
    tx.sale.findMany({ where: { status: "COMPLETED" }, include: { items: true }, orderBy: [{ soldAt: "asc" }, { createdAt: "asc" }] }),
    tx.productVariant.findMany({ select: { id: true } }),
  ]);
  const balances = new Map<string, Balance>(variants.map((variant) => [variant.id, { quantity: 0, averageCost: 0 }]));
  const movements = [
    ...entries.map((entry) => ({ type: "entry" as const, at: entry.occurredAt, createdAt: entry.createdAt, value: entry })),
    ...sales.map((sale) => ({ type: "sale" as const, at: sale.soldAt, createdAt: sale.createdAt, value: sale })),
  ].sort((left, right) => left.at.getTime() - right.at.getTime() || left.createdAt.getTime() - right.createdAt.getTime());

  for (const movement of movements) {
    if (movement.type === "entry") {
      for (const item of movement.value.items) {
        const balance = balances.get(item.productVariantId);
        if (!balance) throw new Error("INVALID_VARIANT");
        const previousQuantity = balance.quantity;
        const previousAverage = balance.averageCost;
        balance.quantity += item.quantity;
        balance.averageCost = calculateWeightedAverage(previousQuantity, previousAverage, item.quantity, Number(item.unitCost));
        await tx.stockEntryItem.update({ where: { id: item.id }, data: { previousQuantity, previousAverageCost: previousAverage.toFixed(4), resultingQuantity: balance.quantity, resultingAverageCost: balance.averageCost.toFixed(4) } });
      }
    } else {
      let totalRevenue = 0;
      let totalCost = 0;
      for (const item of movement.value.items) {
        const balance = balances.get(item.productVariantId);
        if (!balance || balance.quantity < item.quantity) throw new Error("NEGATIVE_STOCK");
        const lineRevenue = item.quantity * Number(item.unitSalePrice);
        const lineCost = item.quantity * balance.averageCost;
        balance.quantity -= item.quantity;
        totalRevenue += lineRevenue;
        totalCost += lineCost;
        await tx.saleItem.update({ where: { id: item.id }, data: { unitCostSnapshot: balance.averageCost.toFixed(4), lineRevenue: lineRevenue.toFixed(2), lineCost: lineCost.toFixed(2), lineGrossProfit: (lineRevenue - lineCost).toFixed(2) } });
      }
      await tx.sale.update({ where: { id: movement.value.id }, data: { totalRevenue: totalRevenue.toFixed(2), totalCost: totalCost.toFixed(2), totalGrossProfit: (totalRevenue - totalCost).toFixed(2) } });
    }
  }
  for (const [id, balance] of balances) await tx.productVariant.update({ where: { id }, data: { stockQuantity: balance.quantity, averageUnitCost: balance.averageCost.toFixed(4) } });
}
