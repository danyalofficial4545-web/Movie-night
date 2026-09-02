import { describe, expect, it } from "vitest";
import { getWatchPlaybackSource } from "../client/src/pages/Watch";

const savedPixeldrainUrl = "https://pixeldrain.com/api/file/TgSke7jP?download";

describe("ProMovie Watch to Bro Player handoff", () => {
  it("keeps the saved Pixeldrain URL unchanged for direct native playback", () => {
    const playerSource = getWatchPlaybackSource(savedPixeldrainUrl);
    expect(savedPixeldrainUrl).toBe("https://pixeldrain.com/api/file/TgSke7jP?download");
    expect(playerSource).toBe(savedPixeldrainUrl);
  });

  it("does not require a .mp4 extension when preserving a provider URL", () => {
    const source = "https://buzzheavier.com/8q5samzjluet/download";
    expect(getWatchPlaybackSource(source)).toBe(source);
  });
});
