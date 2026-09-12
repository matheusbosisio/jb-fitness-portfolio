import assert from "node:assert/strict";
import test from "node:test";

import { createCloudinaryImageKey, parseCloudinaryImageKey, productImageUrl } from "../../src/features/catalog/image-key";

test("preserva URL e identificador da foto remota", () => {
  const key = createCloudinaryImageKey("jb-fitness/products/foto", "https://res.cloudinary.com/demo/image/upload/foto.jpg");
  assert.deepEqual(parseCloudinaryImageKey(key), { publicId: "jb-fitness/products/foto", url: "https://res.cloudinary.com/demo/image/upload/foto.jpg" });
  assert.equal(productImageUrl(key), "https://res.cloudinary.com/demo/image/upload/foto.jpg");
});

test("mantém compatibilidade com fotos locais", () => {
  assert.equal(productImageUrl("/uploads/products/foto.png"), "/uploads/products/foto.png");
});

test("recusa referência remota corrompida ou fora do Cloudinary", () => {
  assert.equal(productImageUrl("cloudinary:%E0%A4%A|https://res.cloudinary.com/demo/foto.jpg"), null);
  assert.equal(productImageUrl("cloudinary:foto|https://example.com/foto.jpg"), null);
});
