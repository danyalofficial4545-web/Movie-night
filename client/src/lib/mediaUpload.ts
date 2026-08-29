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

const PROXY_VIDEO_HOSTS = ["pixeldrain.com", "buzzheavier.com", "catbox.moe", "tmpfiles.org", "gofile.io", "streamtape.com", "mixdrop.co", "mixdrop.to", "bunny.net", "b-cdn.net", "cloudflarestream.com", "r2.dev", "cloudflarestorage.com"];

export function getBrowserVideoSourceUrl(value: string) {
  const normalized = getPublicHttpsVideoUrl(value);
  if (!normalized) return null;
  const host = new URL(normalized).hostname.toLowerCase();
  if (!PROXY_VIDEO_HOSTS.some(base => host === base || host.endsWith(`.${base}`))) return normalized;
  return `/api/promovie/video-proxy?url=${encodeURIComponent(normalized)}`;
}

export function isBuzzheavierLandingLink(value: string) {
  const url = getPublicHttpsVideoUrl(value);
  if (!url) return false;
  const parsed = new URL(url);
  return ["buzzheavier.com", "www.buzzheavier.com"].includes(parsed.hostname) && !parsed.searchParams.has("t");
}
