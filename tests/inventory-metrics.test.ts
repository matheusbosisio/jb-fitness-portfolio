import assert from "node:assert/strict";
import test from "node:test";

import { calculateInventoryMetrics } from "../src/features/reports/inventory-metrics";

test("calcula custo, faturamento e lucro potenciais do estoque", () => {
  const result = calculateInventoryMetrics([
    { quantity: 2, averageUnitCost: 40, salePrice: 90 },
    { quantity: 3, averageUnitCost: 50, salePrice: 100 },
  ]);

  assert.deepEqual(result, {
    units: 5,
    costValue: 230,
    potentialRevenue: 480,
    potentialProfit: 250,
  });
});

test("retorna indicadores zerados quando não há estoque", () => {
  assert.deepEqual(calculateInventoryMetrics([]), {
    units: 0,
    costValue: 0,
    potentialRevenue: 0,
    potentialProfit: 0,
  });
});
