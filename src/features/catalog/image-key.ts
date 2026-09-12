const CLOUDINARY_PREFIX = "cloudinary:";

export function createCloudinaryImageKey(publicId: string, secureUrl: string) {
  return `${CLOUDINARY_PREFIX}${encodeURIComponent(publicId)}|${secureUrl}`;
}

export function parseCloudinaryImageKey(imageKey: string | null) {
  if (!imageKey?.startsWith(CLOUDINARY_PREFIX)) return null;
  const separator = imageKey.indexOf("|");
  if (separator < 0) return null;
  try {
    const publicId = decodeURIComponent(imageKey.slice(CLOUDINARY_PREFIX.length, separator));
    const url = new URL(imageKey.slice(separator + 1));
    if (!publicId || url.protocol !== "https:" || url.hostname !== "res.cloudinary.com") return null;
    return { publicId, url: url.toString() };
  } catch {
    return null;
  }
}

export function productImageUrl(imageKey: string | null) {
  if (imageKey?.startsWith(CLOUDINARY_PREFIX)) return parseCloudinaryImageKey(imageKey)?.url ?? null;
  return imageKey;
}
