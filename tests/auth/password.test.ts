import assert from "node:assert/strict";
import test from "node:test";

import { hashPassword, verifyPassword } from "../../src/features/auth/password";

test("gera hash Argon2id e valida a senha correta", async () => {
  const passwordHash = await hashPassword("uma senha longa de teste");

  assert.match(passwordHash, /^\$argon2id\$/);
  assert.equal(await verifyPassword(passwordHash, "uma senha longa de teste"), true);
  assert.equal(await verifyPassword(passwordHash, "senha errada"), false);
});
