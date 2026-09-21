import assert from "node:assert/strict";
import test from "node:test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { reserveLoginAttempt, loginAccountKey } from "../../src/features/auth/login-rate-limit";

test("PostgreSQL limita concorrência, compartilha estado e expira sem reset por sucesso", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const makeClient = () => new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL! }) });
  const first = makeClient(), second = makeClient();
  try {
    await first.loginAttempt.deleteMany();
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) =>
      reserveLoginAttempt(i % 2 ? first : second, "security-test")));
    assert.equal(results.filter(Boolean).length, 5);
    // A new process/client must not get a new budget.
    const restarted = makeClient();
    try { assert.equal(await reserveLoginAttempt(restarted, " SECURITY-TEST "), false); }
    finally { await restarted.$disconnect(); }
    assert.equal(await reserveLoginAttempt(second, "other-account"), true);
    await first.loginAttempt.update({ where: { key: loginAccountKey("security-test") }, data: { resetAt: new Date(0) } });
    assert.equal(await reserveLoginAttempt(first, "security-test"), true);
    // Repeated blocked attempts must not exhaust another user's budget.
    await first.loginAttempt.update({ where: { key: loginAccountKey("security-test") }, data: { attempts: 5 } });
    const blocked = await Promise.all(Array.from({ length: 100 }, () => reserveLoginAttempt(second, "security-test")));
    assert.equal(blocked.filter(Boolean).length, 0);
    assert.equal(await reserveLoginAttempt(second, "new-account"), true);
  } finally {
    await first.loginAttempt.deleteMany();
    await first.$disconnect(); await second.$disconnect();
  }
});
