import assert from "node:assert/strict";
import test from "node:test";
import { currentMonthPeriod, isFutureStoreDate, parseReportPeriod } from "../../src/features/reports/period";

const now = new Date("2026-09-11T15:00:00.000Z");

test("usa o mês atual como período padrão", () => {
  assert.deepEqual(currentMonthPeriod(now), { start: "2026-09-01", end: "2026-09-11" });
});

test("inclui integralmente a data final no fuso da loja", () => {
  const period = parseReportPeriod("2026-08-01", "2026-08-31", now);
  assert.equal(period.from.toISOString(), "2026-08-01T03:00:00.000Z");
  assert.equal(period.until.toISOString(), "2026-09-01T03:00:00.000Z");
});

test("corrige período com início posterior ao fim", () => {
  assert.equal(parseReportPeriod("2026-09-10", "2026-09-01", now).adjusted, true);
});

test("aceita o dia atual da loja mesmo antes das 18 horas UTC", () => {
  const morning = new Date("2026-09-12T10:00:00.000Z");
  assert.equal(isFutureStoreDate("2026-09-12", morning), false);
  assert.equal(isFutureStoreDate("2026-09-13", morning), true);
});
