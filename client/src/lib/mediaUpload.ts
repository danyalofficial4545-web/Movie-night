const CURRENT_DIRECT_VIDEO_LIMIT_BYTES = 50 * 1024 * 1024;

export function canDirectlyUploadLocalVideo(size: number) {
  return Number.isFinite(size) && size > 0 && size <= CURRENT_DIRECT_VIDEO_LIMIT_BYTES;
}

/**
 * Catalogued media is link-based. A source is valid when it is a complete
 * HTTPS URL; the filename or pathname does not need to contain ".mp4".
 */
export function getPublicHttpsVideoUrl(value: string) {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" && Boolean(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}

const PROXY_VIDEO_HOSTS = [
  "pixeldrain.com",
  "buzzheavier.com",
  "catbox.moe",
  "files.catbox.moe",
  "tmpfiles.org",
  "litterbox.catbox.moe",
  "gofile.io",
  "streamtape.com",
  "streamtape.to",
  "streamtape.cc",
  "mixdrop.co",
  "mixdrop.to",
  "mixdrop.sx",
  "bunny.net",
  "b-cdn.net",
  "cloudflarestream.com",
  "r2.dev",
  "cloudflarestorage.com",
];

export function isWhitelistedVideoHost(value: string) {
  const normalized = getPublicHttpsVideoUrl(value);
  if (!normalized) return false;
  const host = new URL(normalized).hostname.toLowerCase();
  return PROXY_VIDEO_HOSTS.some(base => host === base || host.endsWith(`.${base}`));
}

/**
 * Same-origin fallback used only after a direct <video src> fails. This keeps
 * ordinary public links direct while avoiding CORS failures on known hosts.
 */
export function getBrowserVideoSourceUrl(value: string) {
  const normalized = getPublicHttpsVideoUrl(value);
  if (!normalized) return null;
  return isWhitelistedVideoHost(normalized)
    ? `/api/promovie/video-proxy?url=${encodeURIComponent(normalized)}`
    : normalized;
}

export function isBuzzheavierLandingLink(value: string) {
  const url = getPublicHttpsVideoUrl(value);
  if (!url) return false;
  const parsed = new URL(url);
  return ["buzzheavier.com", "www.buzzheavier.com"].includes(parsed.hostname) && !parsed.searchParams.has("t");
}
