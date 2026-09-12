import assert from "node:assert/strict";
import test from "node:test";

import { buildDailySalesSeries } from "../src/features/reports/daily-sales-series";

test("agrupa receita e lucro e preenche dias sem vendas", () => {
  const series = buildDailySalesSeries([
    { soldAt: new Date("2026-09-10T18:00:00.000Z"), revenue: 100, profit: 40 },
    { soldAt: new Date("2026-09-10T19:00:00.000Z"), revenue: 50, profit: 20 },
    { soldAt: new Date("2026-09-12T18:00:00.000Z"), revenue: 80, profit: 30 },
  ], "2026-09-12", 3);

  assert.deepEqual(series.map(({ date, revenue, profit }) => ({ date, revenue, profit })), [
    { date: "2026-09-10", revenue: 150, profit: 60 },
    { date: "2026-09-11", revenue: 0, profit: 0 },
    { date: "2026-09-12", revenue: 80, profit: 30 },
  ]);
});
