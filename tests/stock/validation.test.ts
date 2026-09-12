import assert from "node:assert/strict";
import test from "node:test";

import { calculateWeightedAverage, parseCost, stockEntrySchema } from "../../src/features/stock/validation";

const variantId = "1da5a52c-798c-4b25-9010-e8d8eac1c465";

test("calcula o custo médio ponderado com quatro casas", () => {
  assert.equal(calculateWeightedAverage(10, 20, 5, 32), 24);
  assert.equal(calculateWeightedAverage(3, 10.1234, 2, 20.5678), 14.3012);
});

test("aceita vírgula no custo unitário", () => {
  assert.equal(parseCost("49,9876"), 49.9876);
});

test("rejeita a mesma variação repetida", () => {
  const result = stockEntrySchema.safeParse({ occurredOn: "2026-09-10", notes: "", items: [{ variantId, quantity: 2, unitCost: "50,00" }, { variantId, quantity: 1, unitCost: "51,00" }] });
  assert.equal(result.success, false);
});

test("rejeita quantidade zero", () => {
  const result = stockEntrySchema.safeParse({ occurredOn: "2026-09-10", notes: "", items: [{ variantId, quantity: 0, unitCost: "50,00" }] });
  assert.equal(result.success, false);
});
