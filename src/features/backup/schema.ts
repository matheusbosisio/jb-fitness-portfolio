import { z } from "zod";

const id = z.string().uuid();
const date = z.string().datetime();
const decimal = z.string().regex(/^-?\d+(\.\d+)?$/);

export const backupSchema = z.object({
  version: z.literal(1),
  generatedAt: date,
  categories: z.array(z.object({ id, name: z.string(), normalizedName: z.string(), active: z.boolean() })),
  products: z.array(z.object({ id, categoryId: id, name: z.string(), normalizedName: z.string(), description: z.string().nullable(), salePrice: decimal, imageKey: z.string().nullable().default(null), active: z.boolean() })),
  variants: z.array(z.object({ id, productId: id, color: z.string().nullable(), normalizedColor: z.string(), size: z.enum(["NO_SIZE", "P", "M", "G", "GG"]), stockQuantity: z.number().int(), averageUnitCost: decimal, active: z.boolean() })),
  stockEntries: z.array(z.object({ id, status: z.enum(["POSTED", "CORRECTED"]), occurredAt: date, notes: z.string().nullable(), replacesEntryId: id.nullable() })),
  stockEntryItems: z.array(z.object({ id, stockEntryId: id, productVariantId: id, quantity: z.number().int(), unitCost: decimal, previousQuantity: z.number().int(), previousAverageCost: decimal, resultingQuantity: z.number().int(), resultingAverageCost: decimal })),
  sales: z.array(z.object({ id, status: z.enum(["COMPLETED", "CANCELLED"]), paymentMethod: z.enum(["PIX", "CASH", "DEBIT_CARD", "CREDIT_CARD"]), soldAt: date, totalRevenue: decimal, totalCost: decimal, totalGrossProfit: decimal, cancelledAt: date.nullable(), cancellationReason: z.string().nullable(), replacesSaleId: id.nullable() })),
  saleItems: z.array(z.object({ id, saleId: id, productVariantId: id, quantity: z.number().int(), unitSalePrice: decimal, unitCostSnapshot: decimal, lineRevenue: decimal, lineCost: decimal, lineGrossProfit: decimal })),
});

export type BackupData = z.infer<typeof backupSchema>;
