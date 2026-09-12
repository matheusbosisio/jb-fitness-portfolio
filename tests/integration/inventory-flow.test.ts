import assert from "node:assert/strict";
import test, { after } from "node:test";

import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../../src/generated/prisma/client";
import { rebuildInventory } from "../../src/features/stock/rebuild-core";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const prisma = testDatabaseUrl ? new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl }) }) : null;
const integrationTest = testDatabaseUrl ? test : test.skip;

async function resetDatabase() {
  if (!prisma) return;
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.stockEntryItem.deleteMany();
  await prisma.stockEntry.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}

async function createScenario(initialQuantity = 10) {
  if (!prisma) throw new Error("TEST_DATABASE_URL não definida");
  await resetDatabase();
  const user = await prisma.user.create({ data: { name: "Teste", email: "integration@jb.test", passwordHash: "not-used-in-integration-test" } });
  const category = await prisma.category.create({ data: { name: "Teste", normalizedName: "teste" } });
  const product = await prisma.product.create({ data: { name: "Produto teste", normalizedName: "produto teste", salePrice: "90", categoryId: category.id, variants: { create: { color: "Preto", normalizedColor: "preto", size: "M" } } }, include: { variants: true } });
  const variant = product.variants[0];
  await prisma.$transaction(async (tx) => {
    await tx.stockEntry.create({ data: { occurredAt: new Date("2026-01-01T12:00:00Z"), createdById: user.id, items: { create: { productVariantId: variant.id, quantity: initialQuantity, unitCost: "40", previousQuantity: 0, previousAverageCost: "0", resultingQuantity: 0, resultingAverageCost: "0" } } } });
    await rebuildInventory(tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return { user, variant };
}

async function postSale(userId: string, variantId: string, quantity: number, price = 90) {
  if (!prisma) throw new Error("TEST_DATABASE_URL não definida");
  return prisma.$transaction(async (tx) => {
    const revenue = quantity * price;
    const sale = await tx.sale.create({ data: { soldAt: new Date("2026-01-02T18:00:00Z"), paymentMethod: "PIX", totalRevenue: revenue.toFixed(2), totalCost: "0", totalGrossProfit: revenue.toFixed(2), createdById: userId, items: { create: { productVariantId: variantId, quantity, unitSalePrice: price.toFixed(2), unitCostSnapshot: "0", lineRevenue: revenue.toFixed(2), lineCost: "0", lineGrossProfit: revenue.toFixed(2) } } } });
    await rebuildInventory(tx);
    return sale;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

integrationTest("entrada, venda e cancelamento preservam estoque, custo e lucro", async () => {
  if (!prisma) return;
  const { user, variant } = await createScenario();
  let balance = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
  assert.equal(balance.stockQuantity, 10);
  assert.equal(Number(balance.averageUnitCost), 40);

  const sale = await postSale(user.id, variant.id, 3);
  const savedSale = await prisma.sale.findUniqueOrThrow({ where: { id: sale.id }, include: { items: true } });
  balance = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
  assert.equal(balance.stockQuantity, 7);
  assert.equal(Number(savedSale.totalRevenue), 270);
  assert.equal(Number(savedSale.totalCost), 120);
  assert.equal(Number(savedSale.totalGrossProfit), 150);
  assert.equal(Number(savedSale.items[0].unitCostSnapshot), 40);

  await prisma.$transaction(async (tx) => {
    await tx.sale.update({ where: { id: sale.id }, data: { status: "CANCELLED", cancelledAt: new Date(), cancelledById: user.id } });
    await rebuildInventory(tx);
  });
  balance = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
  assert.equal(balance.stockQuantity, 10);
  assert.equal(await prisma.sale.count({ where: { status: "COMPLETED" } }), 0);
});

integrationTest("venda sem estoque faz rollback completo", async () => {
  if (!prisma) return;
  const { user, variant } = await createScenario(1);
  await assert.rejects(postSale(user.id, variant.id, 2), /NEGATIVE_STOCK/);
  assert.equal(await prisma.sale.count(), 0);
  assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).stockQuantity, 1);
});

integrationTest("duas vendas concorrentes não deixam o estoque negativo", async () => {
  if (!prisma) return;
  const { user, variant } = await createScenario(1);
  const results = await Promise.allSettled([postSale(user.id, variant.id, 1), postSale(user.id, variant.id, 1)]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).stockQuantity, 0);
  assert.equal(await prisma.sale.count({ where: { status: "COMPLETED" } }), 1);
});

integrationTest("excluir venda restaura estoque e excluir entrada inválida faz rollback", async () => {
  if (!prisma) return;
  const { user, variant } = await createScenario(2);
  const sale = await postSale(user.id, variant.id, 1);
  await prisma.$transaction(async (tx) => {
    await tx.saleItem.deleteMany({ where: { saleId: sale.id } });
    await tx.sale.delete({ where: { id: sale.id } });
    await rebuildInventory(tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).stockQuantity, 2);

  const secondSale = await postSale(user.id, variant.id, 2);
  const entry = await prisma.stockEntry.findFirstOrThrow({ where: { status: "POSTED" } });
  await assert.rejects(prisma.$transaction(async (tx) => {
    await tx.stockEntryItem.deleteMany({ where: { stockEntryId: entry.id } });
    await tx.stockEntry.delete({ where: { id: entry.id } });
    await rebuildInventory(tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }), /NEGATIVE_STOCK/);
  assert.equal(await prisma.stockEntry.count({ where: { id: entry.id } }), 1);
  assert.equal(await prisma.sale.count({ where: { id: secondSale.id } }), 1);
});

after(async () => { await resetDatabase(); await prisma?.$disconnect(); });
