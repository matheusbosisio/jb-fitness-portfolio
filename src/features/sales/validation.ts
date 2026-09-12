import { z } from "zod";

export const paymentMethods = ["PIX", "CASH", "DEBIT_CARD", "CREDIT_CARD"] as const;

const saleItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.coerce.number().int().positive("A quantidade deve ser maior que zero."),
  unitSalePrice: z.string().trim().regex(/^\d{1,12}([,.]\d{1,2})?$/, "Informe um preço válido."),
});

export const saleSchema = z
  .object({
    soldOn: z.string().date("Informe uma data válida."),
    paymentMethod: z.enum(paymentMethods, "Selecione a forma de pagamento."),
    items: z.array(saleItemSchema).min(1, "Adicione ao menos uma peça."),
  })
  .superRefine(({ items }, context) => {
    const ids = items.map((item) => item.variantId);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: "custom", path: ["items"], message: "A mesma variação foi adicionada mais de uma vez." });
    }
  });

export type SaleActionState = { error?: string };

export const cancellationSchema = z.object({
  reason: z.string().trim().max(500, "O motivo deve ter no máximo 500 caracteres.").default(""),
});

export function parseSaleItems(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  try { return JSON.parse(value) as unknown; } catch { return []; }
}

export function parseMoney(value: string) {
  return Number(value.replace(",", "."));
}

export function calculateSaleTotal(items: Array<{ quantity: number; unitSalePrice: string }>) {
  return Math.round(items.reduce((total, item) => total + item.quantity * parseMoney(item.unitSalePrice), 0) * 100) / 100;
}
