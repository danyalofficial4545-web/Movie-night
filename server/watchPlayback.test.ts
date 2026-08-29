import { describe, expect, it } from "vitest";
import { getWatchPlaybackSource } from "../client/src/pages/Watch";

const savedPixeldrainUrl = "https://pixeldrain.com/api/file/TgSke7jP?download";

describe("ProMovie Watch to Bro Player handoff", () => {
  it("uses the proxy playback source without rewriting the saved Pixeldrain URL", () => {
    const playerSource = getWatchPlaybackSource(savedPixeldrainUrl);
    expect(savedPixeldrainUrl).toBe("https://pixeldrain.com/api/file/TgSke7jP?download");
    expect(playerSource).toBe(`/api/promovie/video-proxy?url=${encodeURIComponent(savedPixeldrainUrl)}`);
    expect(playerSource).not.toBe(savedPixeldrainUrl);
  });
});
