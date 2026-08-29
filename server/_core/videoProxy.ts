import type { Express, Request, Response } from "express";

const allowedHosts = [
  "pixeldrain.com",
  "buzzheavier.com",
  "catbox.moe",
  "tmpfiles.org",
  "gofile.io",
  "streamtape.com",
  "mixdrop.co",
  "mixdrop.to",
  "bunny.net",
  "b-cdn.net",
  "cloudflarestream.com",
  "r2.dev",
  "cloudflarestorage.com",
];

function isAllowedHost(hostname: string) {
  const host = hostname.toLowerCase();
  return allowedHosts.some(base => host === base || host.endsWith(`.${base}`));
}

export function registerVideoProxy(app: Express) {
  app.get("/api/promovie/video-proxy", async (req: Request, res: Response) => {
    const rawUrl = typeof req.query.url === "string" ? req.query.url : "";
    let target: URL;
    try {
      target = new URL(rawUrl);
    } catch {
      res.status(400).send("Invalid video URL");
      return;
    }
    if (target.protocol !== "https:" || !isAllowedHost(target.hostname)) {
      res.status(403).send("This video host is not enabled for in-site playback");
      return;
    }

    try {
      const upstream = await fetch(target, {
        headers: {
          ...(req.headers.range ? { range: req.headers.range } : {}),
          accept: "video/*,*/*;q=0.8",
          "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
          referer: `${target.origin}/`,
        },
        signal: AbortSignal.timeout(30_000),
      });
      if (!upstream.ok && upstream.status !== 206) {
        res.status(upstream.status).send("The external video host did not return a playable video");
        return;
      }
      res.status(upstream.status);
      const contentType = upstream.headers.get("content-type");
      const contentLength = upstream.headers.get("content-length");
      const contentRange = upstream.headers.get("content-range");
      if (contentType) res.setHeader("Content-Type", contentType);
      if (contentLength) res.setHeader("Content-Length", contentLength);
      if (contentRange) res.setHeader("Content-Range", contentRange);
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "private, max-age=60");
      if (!upstream.body) {
        res.end();
        return;
      }
      const reader = upstream.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    } catch {
      if (!res.headersSent) res.status(502).send("Unable to reach the external video host");
      else res.end();
    }
  });
}
