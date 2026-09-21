import assert from "node:assert/strict";
import test from "node:test";
import { loginAccountKey, reserveLoginAttempt } from "../../src/features/auth/login-rate-limit";

test("normalização usa a mesma chave sem armazenar identificador em texto puro", () => {
  assert.equal(loginAccountKey(" Owner@Example.com "), loginAccountKey("owner@example.com"));
  assert.match(loginAccountKey("owner"), /^[a-f0-9]{64}$/);
  assert.notEqual(loginAccountKey("owner"), loginAccountKey("other"));
});

test("falha de armazenamento impede a tentativa em vez de liberar acesso", async () => {
  await assert.rejects(reserveLoginAttempt({
    $queryRaw: async () => { throw new Error("database unavailable"); },
    $executeRaw: async () => 0,
  }, "owner"), /database unavailable/);
});
