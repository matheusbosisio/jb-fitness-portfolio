import assert from "node:assert/strict";
import test from "node:test";

import { editableProductSchema, normalizeCatalogText, parseVariants, productSchema } from "../../src/features/catalog/validation";

test("normaliza espaços, caixa e acentos para evitar duplicidade", () => {
  assert.equal(normalizeCatalogText("  Macacão   Coração "), "macacao coracao");
});

test("aceita produto com variação sem cor e sem tamanho", () => {
  const result = productSchema.safeParse({ name: "Top", categoryId: "1da5a52c-798c-4b25-9010-e8d8eac1c465", description: "", salePrice: "99,90", variants: [{ color: "", size: "NO_SIZE" }] });
  assert.equal(result.success, true);
});

test("rejeita variações repetidas mesmo com caixa e acentos diferentes", () => {
  const result = productSchema.safeParse({ name: "Top", categoryId: "1da5a52c-798c-4b25-9010-e8d8eac1c465", description: "", salePrice: "99.90", variants: [{ color: "Rosê", size: "M" }, { color: "rose", size: "M" }] });
  assert.equal(result.success, false);
});

test("trata JSON inválido de variações como lista vazia", () => {
  assert.deepEqual(parseVariants("não é json"), []);
});

test("aceita edição com variações existentes e novas", () => {
  const result = editableProductSchema.safeParse({
    name: "Conjunto Energy",
    categoryId: "fb4f5c4f-f1ef-438f-8b65-0c357fb04fb3",
    description: "",
    salePrice: "149,90",
    variants: [
      { id: "e30e534d-71f1-4a98-850f-aa4662187714", color: "Preto", size: "M", active: true },
      { color: "Rosa", size: "G", active: true },
    ],
  });
  assert.equal(result.success, true);
});

test("impede desativar todas as variações", () => {
  const result = editableProductSchema.safeParse({
    name: "Conjunto Energy",
    categoryId: "fb4f5c4f-f1ef-438f-8b65-0c357fb04fb3",
    description: "",
    salePrice: "149,90",
    variants: [{ id: "e30e534d-71f1-4a98-850f-aa4662187714", color: "Preto", size: "M", active: false }],
  });
  assert.equal(result.success, false);
});
