import assert from "node:assert/strict";
import test from "node:test";

import { detectProductImageExtension } from "../../src/features/catalog/image-storage";

test("reconhece assinaturas reais de JPG, PNG e WebP", () => {
  assert.equal(detectProductImageExtension(new Uint8Array([0xff, 0xd8, 0xff])), "jpg");
  assert.equal(detectProductImageExtension(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "png");
  assert.equal(detectProductImageExtension(new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80])), "webp");
});

test("recusa arquivo que apenas finge ser imagem", () => {
  assert.equal(detectProductImageExtension(new TextEncoder().encode("arquivo inválido")), null);
});
