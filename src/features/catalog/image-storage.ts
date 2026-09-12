import { createHash, randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { MAX_PRODUCT_IMAGE_BYTES } from "./image-constants";
import { createCloudinaryImageKey, parseCloudinaryImageKey } from "./image-key";

export class ProductImageError extends Error {}

export function detectProductImageExtension(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e &&
    bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a &&
    bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return "png";
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) return "webp";
  return null;
}

export async function saveProductImage(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size === 0) return null;
  if (value.size > MAX_PRODUCT_IMAGE_BYTES) {
    throw new ProductImageError("A foto deve ter no máximo 800 KB.");
  }

  const bytes = new Uint8Array(await value.arrayBuffer());
  const extension = detectProductImageExtension(bytes);
  if (!extension) {
    throw new ProductImageError("Envie uma foto JPG, PNG ou WebP válida.");
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (cloudName && apiKey && apiSecret) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const publicId = randomUUID();
    const folder = "jb-fitness/products";
    const signature = createHash("sha1")
      .update(`folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
      .digest("hex");
    const body = new FormData();
    body.set("file", new Blob([bytes], { type: `image/${extension === "jpg" ? "jpeg" : extension}` }), `produto.${extension}`);
    body.set("api_key", apiKey);
    body.set("timestamp", timestamp);
    body.set("folder", folder);
    body.set("public_id", publicId);
    body.set("signature", signature);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body });
    if (!response.ok) throw new ProductImageError("Não foi possível enviar a foto. Tente novamente.");
    const uploaded = await response.json() as { public_id: string; secure_url: string };
    return createCloudinaryImageKey(uploaded.public_id, uploaded.secure_url);
  }

  if (process.env.NODE_ENV === "production") {
    throw new ProductImageError("O armazenamento de fotos ainda não foi configurado.");
  }

  const directory = path.join(process.cwd(), "public", "uploads", "products");
  const filename = `${randomUUID()}.${extension}`;
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), bytes, { flag: "wx" });
  return `/uploads/products/${filename}`;
}

export async function removeProductImage(imageKey: string | null) {
  const cloudinary = parseCloudinaryImageKey(imageKey);
  if (cloudinary) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) return;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createHash("sha1")
      .update(`public_id=${cloudinary.publicId}&timestamp=${timestamp}${apiSecret}`)
      .digest("hex");
    const body = new URLSearchParams({ public_id: cloudinary.publicId, timestamp, api_key: apiKey, signature });
    await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, { method: "POST", body });
    return;
  }
  if (!imageKey?.startsWith("/uploads/products/")) return;
  const directory = path.resolve(process.cwd(), "public", "uploads", "products");
  const target = path.resolve(process.cwd(), "public", imageKey.slice(1));
  if (path.dirname(target) !== directory) return;
  await unlink(target).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
}
