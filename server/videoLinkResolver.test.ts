import { describe, expect, it } from "vitest";
import { extractBuzzheavierMp4Source, extractBuzzheavierPreviewPath, getVideoLinkProvider, pixeldrainPlaybackUrl, resolveVideoPlaybackLink } from "./videoLinkResolver";

const buzzLink = "https://buzzheavier.com/8q5samzjluet/download";
const previewToken = "token123";
const directBuzzMp4 = "https://ts.buzzheavier.com/d/8q5samzjluet?v=token123";

describe("ProMovie public video link resolver", () => {
  it("accepts direct public HTTPS links and recognizes Buzzheavier, Catbox, and Pixeldrain providers", () => {
    expect(getVideoLinkProvider(buzzLink)).toBe("buzzheavier");
    expect(getVideoLinkProvider("https://files.catbox.moe/abc123.mp4")).toBe("catbox");
    expect(getVideoLinkProvider("https://pixeldrain.com/u/abc123")).toBe("pixeldrain");
    expect(getVideoLinkProvider("https://cdn.example.com/episode.mp4")).toBe("direct");
  });

  it("turns a Pixeldrain share URL into its browser-playable file endpoint", () => {
    expect(pixeldrainPlaybackUrl("https://pixeldrain.com/u/abc123")).toBe("https://pixeldrain.com/api/file/abc123?download=1");
  });

  it("preserves the supplied Pixeldrain API MP4 URL with its download query", async () => {
    const supplied = "https://pixeldrain.com/api/file/TgSke7jP?download";
    await expect(resolveVideoPlaybackLink(supplied)).resolves.toMatchObject({ originalUrl: supplied, playbackUrl: supplied, provider: "pixeldrain" });
  });

  it("extracts the temporary playable MP4 from Buzzheavier’s documented landing and preview responses", async () => {
    const calls: string[] = [];
    const request = async (input: RequestInfo | URL) => {
      const url = String(input); calls.push(url);
      if (url.endsWith("/8q5samzjluet")) return new Response(`<a hx-get="/8q5samzjluet/preview?t=${previewToken}">Open</a>`, { status: 200 });
      return new Response(`<video><source src="${directBuzzMp4}" type="video/mp4"></video>`, { status: 200 });
    };
    expect(extractBuzzheavierPreviewPath(`<a hx-get="/8q5samzjluet/preview?t=${previewToken}">Open</a>`, "8q5samzjluet")).toBe(`/8q5samzjluet/preview?t=${previewToken}`);
    expect(extractBuzzheavierMp4Source(`<source src="${directBuzzMp4}" type="video/mp4">`)).toBe(directBuzzMp4);
    await expect(resolveVideoPlaybackLink(buzzLink, request as typeof fetch)).resolves.toMatchObject({ originalUrl: buzzLink, playbackUrl: directBuzzMp4, provider: "buzzheavier", resolved: true });
    expect(calls).toHaveLength(2);
  });

  it("uses the tokenized Buzzheavier copied download URL as a direct playable source without server-side fetching", async () => {
    const copiedLink = `${buzzLink}?t=provider-token`;
    await expect(resolveVideoPlaybackLink(copiedLink)).resolves.toMatchObject({ originalUrl: copiedLink, playbackUrl: copiedLink, provider: "buzzheavier", resolved: true });
  });
});
