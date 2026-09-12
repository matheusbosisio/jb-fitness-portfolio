import { z } from "zod";

const entryItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.coerce.number().int().positive("A quantidade deve ser maior que zero."),
  unitCost: z.string().trim().regex(/^\d{1,10}([,.]\d{1,4})?$/, "Informe um custo válido."),
});

export const stockEntrySchema = z
  .object({
    occurredOn: z.string().date("Informe uma data válida."),
    notes: z.string().trim().max(500).default(""),
    items: z.array(entryItemSchema).min(1, "Adicione ao menos um item."),
  })
  .superRefine(({ items }, context) => {
    const ids = items.map((item) => item.variantId);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: "custom", path: ["items"], message: "A mesma variação foi adicionada mais de uma vez." });
    }
  });

export type StockEntryActionState = { error?: string };

export function parseEntryItems(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  try { return JSON.parse(value) as unknown; } catch { return []; }
}

export function parseCost(value: string) {
  return Number(value.replace(",", "."));
}

export function calculateWeightedAverage(previousQuantity: number, previousAverage: number, addedQuantity: number, unitCost: number) {
  const resultingQuantity = previousQuantity + addedQuantity;
  if (resultingQuantity <= 0) return 0;
  return Math.round(((previousQuantity * previousAverage + addedQuantity * unitCost) / resultingQuantity) * 10_000) / 10_000;
}
