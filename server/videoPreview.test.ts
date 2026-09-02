import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PublicVideoPreview } from "../client/src/components/ProMovieMediaField";

describe("ProMovie administrator video preview", () => {
  it("renders a controlled native video preview immediately for a public HTTPS MP4", () => {
    const url = "https://samplelib.com/preview/mp4/sample-5s.mp4";
    const html = renderToStaticMarkup(createElement(PublicVideoPreview, { value: url }));
    expect(html).toContain("Video preview");
    expect(html).toContain('src="https://samplelib.com/preview/mp4/sample-5s.mp4"');
    expect(html).toContain("controls");
    expect(html).toContain("Ready to save:");
  });

  it("renders the supplied Pixeldrain API URL without requiring an .mp4 suffix", () => {
    const url = "https://pixeldrain.com/api/file/TgSke7jP?download";
    const html = renderToStaticMarkup(createElement(PublicVideoPreview, { value: url }));
    expect(html).toContain('src="https://pixeldrain.com/api/file/TgSke7jP?download"');
    expect(html).toContain(`Ready to save: ${url}`);
    expect(html).toContain('crossorigin="anonymous"');
    expect(html).toContain("controls");
  });

  it("does not render a video preview for an incomplete or non-HTTPS value", () => {
    expect(renderToStaticMarkup(createElement(PublicVideoPreview, { value: "video.mp4" }))).toBe("");
    expect(renderToStaticMarkup(createElement(PublicVideoPreview, { value: "http://example.com/video.mp4" }))).toBe("");
  });
});
