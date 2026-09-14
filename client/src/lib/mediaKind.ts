export type MediaKind = "direct" | "telegram" | "external";

const DIRECT_HOSTS = [
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
  "doodstream.com",
  "dood.pm",
];

export function getMediaKind(value: string): MediaKind {
  try {
    const url = new URL(value.trim().startsWith("http") ? value.trim() : `https://${value.trim()}`);
    const host = url.hostname.toLowerCase();
    if (host === "t.me" || host.endsWith(".t.me") || host === "telegram.me" || host.endsWith(".telegram.me")) return "telegram";
    if (DIRECT_HOSTS.some(base => host === base || host.endsWith(`.${base}`))) return "direct";
    if (/\.(mp4|webm|ogg|m3u8)(?:$|\?)/i.test(url.pathname + url.search)) return "direct";
    return "external";
  } catch {
    return "external";
  }
}

export function normalizeMediaUrl(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith("http://") ? trimmed.replace(/^http:/, "https:") : trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}
