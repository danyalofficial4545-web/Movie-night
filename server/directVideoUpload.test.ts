import { describe, expect, it, vi } from "vitest";
import { uploadVideoToSignedUrl } from "../client/src/lib/directVideoUpload";

type FakeMode = "success" | "error" | "idle";

function installFakeXhr(mode: FakeMode) {
  class FakeXhr {
    static latest: FakeXhr | undefined;
    status = 0;
    upload: { onprogress: ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = { onprogress: null };
    onerror: (() => void) | null = null;
    ontimeout: (() => void) | null = null;
    onabort: (() => void) | null = null;
    onload: (() => void) | null = null;
    headers: Record<string, string> = {};
    open() { FakeXhr.latest = this; }
    setRequestHeader(name: string, value: string) { this.headers[name] = value; }
    abort() { this.onabort?.(); }
    send() {
      if (mode === "success") {
        this.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 });
        this.status = 201;
        this.onload?.();
      }
      if (mode === "error") this.onerror?.();
    }
  }
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
  return FakeXhr;
}

describe("ProMovie direct video upload status", () => {
  it("reports genuine byte progress and succeeds only after a successful signed PUT", async () => {
    const FakeXhr = installFakeXhr("success");
    const progress: number[] = [];
    await expect(uploadVideoToSignedUrl({ file: new File(["video"], "episode.mp4", { type: "video/mp4" }), uploadUrl: "https://storage.example/upload", contentType: "video/mp4", onProgress: value => progress.push(value) })).resolves.toBeUndefined();
    expect(progress).toEqual([0, 50]);
    expect(FakeXhr.latest?.headers["x-upsert"]).toBe("false");
  });

  it("returns a clear error instead of retaining a misleading partial percentage", async () => {
    installFakeXhr("error");
    await expect(uploadVideoToSignedUrl({ file: new File(["video"], "episode.mp4", { type: "video/mp4" }), uploadUrl: "https://storage.example/upload", contentType: "video/mp4", onProgress: () => undefined })).rejects.toThrow(/Video upload failed/i);
  });

  it("aborts an idle request with explicit external-URL guidance rather than staying stuck", async () => {
    vi.useFakeTimers();
    installFakeXhr("idle");
    const pending = uploadVideoToSignedUrl({ file: new File(["video"], "episode.mp4", { type: "video/mp4" }), uploadUrl: "https://storage.example/upload", contentType: "video/mp4", onProgress: () => undefined });
    const timeoutExpectation = expect(pending).rejects.toThrow(/no video data was transferred for 90 seconds/i);
    await vi.advanceTimersByTimeAsync(95_000);
    await timeoutExpectation;
    vi.useRealTimers();
  });
});
