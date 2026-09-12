import assert from "node:assert/strict";
import test from "node:test";

import { loginSchema, ownerSchema } from "../../src/features/auth/validation";

test("normaliza o e-mail usado no login", () => {
  const result = loginSchema.parse({
    email: "  DONA@EXAMPLE.COM ",
    password: "senha",
  });

  assert.equal(result.email, "dona@example.com");
});

test("recusa senha curta na criação da conta proprietária", () => {
  const result = ownerSchema.safeParse({
    name: "Dona da Loja",
    email: "dona@example.com",
    password: "curta",
  });

  assert.equal(result.success, false);
});
