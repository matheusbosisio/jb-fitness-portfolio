import assert from "node:assert/strict";
import test from "node:test";

import { LoginRateLimiter } from "../../src/features/auth/login-rate-limit";

test("bloqueia após cinco falhas dentro de quinze minutos", () => {
  const limiter = new LoginRateLimiter();
  for (let index = 0; index < 5; index += 1) limiter.recordFailure("origem", 1_000);
  assert.equal(limiter.isBlocked("origem", 2_000), true);
  assert.equal(limiter.isBlocked("outra-origem", 2_000), false);
});

test("libera depois da janela ou após autenticação correta", () => {
  const limiter = new LoginRateLimiter();
  for (let index = 0; index < 5; index += 1) limiter.recordFailure("origem", 1_000);
  assert.equal(limiter.isBlocked("origem", 1_000 + 15 * 60 * 1000), false);
  limiter.recordFailure("origem", 2_000_000);
  limiter.clear("origem");
  assert.equal(limiter.isBlocked("origem", 2_000_001), false);
});
