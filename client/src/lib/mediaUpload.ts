export const CURRENT_DIRECT_VIDEO_LIMIT_BYTES = 50 * 1024 * 1024;

export function canDirectlyUploadLocalVideo(size: number) {
  return Number.isFinite(size) && size > 0 && size <= CURRENT_DIRECT_VIDEO_LIMIT_BYTES;
}

export function getPublicHttpsVideoUrl(value: string) {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function isBuzzheavierLandingLink(value: string) {
  const url = getPublicHttpsVideoUrl(value);
  if (!url) return false;
  const parsed = new URL(url);
  return ["buzzheavier.com", "www.buzzheavier.com"].includes(parsed.hostname) && !parsed.searchParams.has("t");
}
