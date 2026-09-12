import { z } from "zod";

export const productSizes = ["NO_SIZE", "P", "M", "G", "GG"] as const;

export const normalizeCatalogText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Informe uma categoria.").max(80),
});

const variantSchema = z.object({
  color: z.string().trim().max(60).default(""),
  size: z.enum(productSizes),
});

const editableVariantSchema = variantSchema.extend({
  id: z.string().uuid().optional(),
  active: z.boolean().default(true),
});

function validateUniqueVariants(
  variants: Array<{ color: string; size: string }>,
  context: z.RefinementCtx,
) {
  const identities = variants.map(
    ({ color, size }) => `${normalizeCatalogText(color)}:${size}`,
  );
  if (new Set(identities).size !== identities.length) {
    context.addIssue({
      code: "custom",
      path: ["variants"],
      message: "Existem variações repetidas.",
    });
  }
}

export const productSchema = z
  .object({
    name: z.string().trim().min(2, "Informe o nome do produto.").max(140),
    categoryId: z.string().uuid("Selecione uma categoria."),
    description: z.string().trim().max(2000).default(""),
    salePrice: z
      .string()
      .trim()
      .regex(/^\d{1,12}([,.]\d{1,2})?$/, "Informe um preço válido."),
    variants: z.array(variantSchema).min(1, "Adicione ao menos uma variação."),
  })
  .superRefine(({ variants }, context) => validateUniqueVariants(variants, context));

export const editableProductSchema = productSchema
  .safeExtend({ variants: z.array(editableVariantSchema).min(1) })
  .superRefine(({ variants }, context) => {
    validateUniqueVariants(variants, context);
    if (!variants.some((variant) => variant.active)) {
      context.addIssue({
        code: "custom",
        path: ["variants"],
        message: "Mantenha ao menos uma variação ativa.",
      });
    }
  });

export type CatalogActionState = { error?: string };

export function parseVariants(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return [];
  }
}
