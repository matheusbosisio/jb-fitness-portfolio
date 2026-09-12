import assert from "node:assert/strict";
import test from "node:test";

import { createSessionToken, hashSessionToken } from "../../src/features/auth/token";

test("gera tokens imprevisíveis e armazena apenas um hash SHA-256", () => {
  const firstToken = createSessionToken();
  const secondToken = createSessionToken();

  assert.notEqual(firstToken, secondToken);
  assert.equal(hashSessionToken(firstToken).length, 64);
  assert.equal(hashSessionToken(firstToken), hashSessionToken(firstToken));
  assert.notEqual(hashSessionToken(firstToken), firstToken);
});
