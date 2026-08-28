export type ResolvedVideoLink = { originalUrl: string; playbackUrl: string; provider: "buzzheavier" | "pixeldrain" | "catbox" | "direct"; resolved: boolean };

const BUZZHEAVIER_HOSTS = new Set(["buzzheavier.com", "www.buzzheavier.com"]);
const PIXELDRAIN_HOSTS = new Set(["pixeldrain.com", "www.pixeldrain.com"]);
const CATBOX_HOSTS = new Set(["files.catbox.moe", "catbox.moe", "www.catbox.moe"]);

function publicHttpsUrl(value: string) {
  const url = new URL(value.trim());
  if (url.protocol !== "https:") throw new Error("Use a public HTTPS video link.");
  return url;
}

export function getVideoLinkProvider(value: string): ResolvedVideoLink["provider"] {
  const url = publicHttpsUrl(value);
  if (BUZZHEAVIER_HOSTS.has(url.hostname)) return "buzzheavier";
  if (PIXELDRAIN_HOSTS.has(url.hostname)) return "pixeldrain";
  if (CATBOX_HOSTS.has(url.hostname)) return "catbox";
  return "direct";
}

export function pixeldrainPlaybackUrl(value: string) {
  const url = publicHttpsUrl(value);
  const match = url.pathname.match(/^\/(?:u|l)\/([A-Za-z0-9_-]+)\/?$/);
  return match ? `https://pixeldrain.com/api/file/${match[1]}?download=1` : value.trim();
}

export function extractBuzzheavierPreviewPath(html: string, fileId: string) {
  const match = html.match(new RegExp(`hx-get=["'](/${fileId}/preview\\?t=[^"']+)["']`, "i"));
  return match?.[1]?.replace(/&amp;/g, "&") ?? null;
}

export function extractBuzzheavierMp4Source(html: string) {
  const match = html.match(/<source\s+[^>]*src=["']([^"']+)["'][^>]*type=["']video\/mp4["']/i);
  const source = match?.[1]?.replace(/&amp;/g, "&") ?? null;
  return source && source.startsWith("https://") ? source : null;
}

export async function resolveVideoPlaybackLink(value: string, request: typeof fetch = fetch): Promise<ResolvedVideoLink> {
  const originalUrl = value.trim();
  const url = publicHttpsUrl(originalUrl);
  const provider = getVideoLinkProvider(originalUrl);
  if (provider === "pixeldrain") {
    const playbackUrl = pixeldrainPlaybackUrl(originalUrl);
    return { originalUrl, playbackUrl, provider, resolved: playbackUrl !== originalUrl };
  }
  if (provider !== "buzzheavier") return { originalUrl, playbackUrl: originalUrl, provider, resolved: false };

  if (url.pathname.endsWith("/download") && url.searchParams.has("t")) {
    return { originalUrl, playbackUrl: originalUrl, provider, resolved: true };
  }

  const fileId = url.pathname.match(/^\/([A-Za-z0-9_-]+)(?:\/download)?\/?$/)?.[1];
  if (!fileId) return { originalUrl, playbackUrl: originalUrl, provider, resolved: false };
  try {
    const landing = await request(`https://buzzheavier.com/${fileId}`, { headers: { "user-agent": "ProMovie media resolver" }, signal: AbortSignal.timeout(8_000) });
    if (!landing.ok) return { originalUrl, playbackUrl: originalUrl, provider, resolved: false };
    const previewPath = extractBuzzheavierPreviewPath(await landing.text(), fileId);
    if (!previewPath) return { originalUrl, playbackUrl: originalUrl, provider, resolved: false };
    const preview = await request(new URL(previewPath, "https://buzzheavier.com").toString(), { headers: { "user-agent": "ProMovie media resolver" }, signal: AbortSignal.timeout(8_000) });
    if (!preview.ok) return { originalUrl, playbackUrl: originalUrl, provider, resolved: false };
    const playbackUrl = extractBuzzheavierMp4Source(await preview.text());
    return { originalUrl, playbackUrl: playbackUrl ?? originalUrl, provider, resolved: Boolean(playbackUrl) };
  } catch {
    return { originalUrl, playbackUrl: originalUrl, provider, resolved: false };
  }
}
