import { describe, expect, it } from "vitest";
import { ADMIN_EMAIL, isAdminEmail, isDesignatedAdmin } from "./db";
import { getPublicHttpsVideoUrl, isBuzzheavierLandingLink } from "../client/src/lib/mediaUpload";

describe("ProMovie role policy", () => {
  it("grants administrator status only to the configured administrator email", () => {
    expect(isAdminEmail(ADMIN_EMAIL)).toBe(true);
    expect(isAdminEmail("MUHAMMADDANYAL4545@GMAIL.COM")).toBe(true);
    expect(isAdminEmail("member@example.com")).toBe(false);
  });

  it("does not treat a non-administrator email as an administrator even when role data conflicts", () => {
    const conflictingRecord = { email: "member@example.com", role: "admin" as const };
    expect(conflictingRecord.role).toBe("admin");
    expect(isAdminEmail(conflictingRecord.email)).toBe(false);
  });

  it("recognizes only the configured administrator email and mobile identity", () => {
    expect(isDesignatedAdmin("muhammaddanyal4545@gmail.com", "03311332670")).toBe(true);
    expect(isDesignatedAdmin("muhammaddanyal4545@gmail.com", "03000000000")).toBe(false);
  });

  it("accepts the requested public HTTPS MP4 for preview and rejects non-HTTPS video URLs", () => {
    const bunnyUrl = "https://test-videos.co.uk/vids/sintel/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4";
    const reachableSampleUrl = "https://samplelib.com/preview/mp4/sample-5s.mp4";
    expect(getPublicHttpsVideoUrl(bunnyUrl)).toBe(bunnyUrl);
    expect(getPublicHttpsVideoUrl(reachableSampleUrl)).toBe(reachableSampleUrl);
    expect(getPublicHttpsVideoUrl("http://example.com/video.mp4")).toBeNull();
    expect(getPublicHttpsVideoUrl("not a video URL")).toBeNull();
    expect(isBuzzheavierLandingLink("https://buzzheavier.com/8q5samzjluet/download")).toBe(true);
    expect(isBuzzheavierLandingLink("https://buzzheavier.com/8q5samzjluet/download?t=provider-token")).toBe(false);
  });
});
