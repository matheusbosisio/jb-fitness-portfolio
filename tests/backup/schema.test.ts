import assert from "node:assert/strict";
import test from "node:test";

import { backupSchema } from "../../src/features/backup/schema";

const emptyBackup = { version: 1, generatedAt: "2026-09-11T12:00:00.000Z", categories: [], products: [], variants: [], stockEntries: [], stockEntryItems: [], sales: [], saleItems: [] };

test("aceita backup vazio na versão atual", () => {
  assert.equal(backupSchema.safeParse(emptyBackup).success, true);
});

test("recusa versão desconhecida e identificadores inválidos", () => {
  assert.equal(backupSchema.safeParse({ ...emptyBackup, version: 2 }).success, false);
  assert.equal(backupSchema.safeParse({ ...emptyBackup, categories: [{ id: "x", name: "Teste", normalizedName: "teste", active: true }] }).success, false);
});
