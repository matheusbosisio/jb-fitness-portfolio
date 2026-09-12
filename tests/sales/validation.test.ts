import assert from "node:assert/strict";
import test from "node:test";

import { calculateSaleTotal, parseMoney, saleSchema } from "../../src/features/sales/validation";

const variantId = "1da5a52c-798c-4b25-9010-e8d8eac1c465";

test("calcula o total usando o preço efetivo de cada item", () => {
  assert.equal(calculateSaleTotal([{ quantity: 2, unitSalePrice: "89,90" }, { quantity: 1, unitSalePrice: "120.00" }]), 299.8);
});

test("converte valores com vírgula", () => {
  assert.equal(parseMoney("79,90"), 79.9);
});

test("aceita as quatro formas de pagamento", () => {
  for (const paymentMethod of ["PIX", "CASH", "DEBIT_CARD", "CREDIT_CARD"]) {
    assert.equal(saleSchema.safeParse({ soldOn: "2026-09-11", paymentMethod, items: [{ variantId, quantity: 1, unitSalePrice: "99,90" }] }).success, true);
  }
});

test("rejeita uma variação repetida na mesma venda", () => {
  const result = saleSchema.safeParse({ soldOn: "2026-09-11", paymentMethod: "PIX", items: [{ variantId, quantity: 1, unitSalePrice: "99,90" }, { variantId, quantity: 1, unitSalePrice: "89,90" }] });
  assert.equal(result.success, false);
});
