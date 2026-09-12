import { prisma } from "@/server/db/client";
import { backupSchema, type BackupData } from "./schema";

const iso = (value: Date) => value.toISOString();
const numberText = (value: { toString(): string }) => value.toString();

export async function createBackup(): Promise<BackupData> {
  const [categories, products, variants, stockEntries, stockEntryItems, sales, saleItems] = await Promise.all([
    prisma.category.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.product.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.productVariant.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.stockEntry.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.stockEntryItem.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.sale.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.saleItem.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    categories: categories.map(({ id, name, normalizedName, active }) => ({ id, name, normalizedName, active })),
    products: products.map(({ id, categoryId, name, normalizedName, description, salePrice, imageKey, active }) => ({ id, categoryId, name, normalizedName, description, salePrice: numberText(salePrice), imageKey, active })),
    variants: variants.map(({ id, productId, color, normalizedColor, size, stockQuantity, averageUnitCost, active }) => ({ id, productId, color, normalizedColor, size, stockQuantity, averageUnitCost: numberText(averageUnitCost), active })),
    stockEntries: stockEntries.map(({ id, status, occurredAt, notes, replacesEntryId }) => ({ id, status, occurredAt: iso(occurredAt), notes, replacesEntryId })),
    stockEntryItems: stockEntryItems.map(({ id, stockEntryId, productVariantId, quantity, unitCost, previousQuantity, previousAverageCost, resultingQuantity, resultingAverageCost }) => ({ id, stockEntryId, productVariantId, quantity, unitCost: numberText(unitCost), previousQuantity, previousAverageCost: numberText(previousAverageCost), resultingQuantity, resultingAverageCost: numberText(resultingAverageCost) })),
    sales: sales.map(({ id, status, paymentMethod, soldAt, totalRevenue, totalCost, totalGrossProfit, cancelledAt, cancellationReason, replacesSaleId }) => ({ id, status, paymentMethod, soldAt: iso(soldAt), totalRevenue: numberText(totalRevenue), totalCost: numberText(totalCost), totalGrossProfit: numberText(totalGrossProfit), cancelledAt: cancelledAt ? iso(cancelledAt) : null, cancellationReason, replacesSaleId })),
    saleItems: saleItems.map(({ id, saleId, productVariantId, quantity, unitSalePrice, unitCostSnapshot, lineRevenue, lineCost, lineGrossProfit }) => ({ id, saleId, productVariantId, quantity, unitSalePrice: numberText(unitSalePrice), unitCostSnapshot: numberText(unitCostSnapshot), lineRevenue: numberText(lineRevenue), lineCost: numberText(lineCost), lineGrossProfit: numberText(lineGrossProfit) })),
  };
}

export function parseBackup(value: unknown) {
  return backupSchema.parse(value);
}

export async function restoreBackup(data: BackupData, ownerId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.stockEntry.updateMany({ data: { replacesEntryId: null } });
    await tx.sale.updateMany({ data: { replacesSaleId: null } });
    await tx.saleItem.deleteMany();
    await tx.sale.deleteMany();
    await tx.stockEntryItem.deleteMany();
    await tx.stockEntry.deleteMany();
    await tx.productVariant.deleteMany();
    await tx.product.deleteMany();
    await tx.category.deleteMany();

    if (data.categories.length) await tx.category.createMany({ data: data.categories });
    if (data.products.length) await tx.product.createMany({ data: data.products });
    if (data.variants.length) await tx.productVariant.createMany({ data: data.variants });
    if (data.stockEntries.length) await tx.stockEntry.createMany({ data: data.stockEntries.map((entry) => ({ id: entry.id, status: entry.status, occurredAt: new Date(entry.occurredAt), notes: entry.notes, createdById: ownerId })) });
    if (data.stockEntryItems.length) await tx.stockEntryItem.createMany({ data: data.stockEntryItems });
    if (data.sales.length) await tx.sale.createMany({ data: data.sales.map((sale) => ({ id: sale.id, status: sale.status, paymentMethod: sale.paymentMethod, soldAt: new Date(sale.soldAt), totalRevenue: sale.totalRevenue, totalCost: sale.totalCost, totalGrossProfit: sale.totalGrossProfit, cancelledAt: sale.cancelledAt ? new Date(sale.cancelledAt) : null, cancellationReason: sale.cancellationReason, createdById: ownerId, cancelledById: sale.cancelledAt ? ownerId : null })) });
    if (data.saleItems.length) await tx.saleItem.createMany({ data: data.saleItems });

    for (const entry of data.stockEntries) if (entry.replacesEntryId) await tx.stockEntry.update({ where: { id: entry.id }, data: { replacesEntryId: entry.replacesEntryId } });
    for (const sale of data.sales) if (sale.replacesSaleId) await tx.sale.update({ where: { id: sale.id }, data: { replacesSaleId: sale.replacesSaleId } });
  }, { maxWait: 10_000, timeout: 30_000 });
}
