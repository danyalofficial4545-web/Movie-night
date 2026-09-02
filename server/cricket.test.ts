import { describe, expect, it, vi } from "vitest";
import { getLiveCricketMatches, resetLiveCricketCache } from "./cricket";

describe("Cricket Hub live score client", () => {
  it("normalizes the documented currentMatches response", async () => {
    resetLiveCricketCache();
    vi.stubEnv("CRICKET_API_KEY", "test-key");
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ status: "success", data: [{ id: "m1", name: "Pakistan vs India", matchType: "t20", status: "Pakistan need 20 runs", venue: "Dubai", dateTimeGMT: "2026-09-02T10:00:00Z", teams: ["Pakistan", "India"], score: [{ r: 180, w: 5, o: 20, inning: "Pakistan" }, { r: 160, w: 8, o: 20, inning: "India" }] }] }), { status: 200, headers: { "content-type": "application/json" } }));
    const result = await getLiveCricketMatches(request);
    expect(result.available).toBe(true);
    expect(result.matches[0]).toMatchObject({ id: "m1", matchType: "T20", teams: ["Pakistan", "India"] });
    expect(result.matches[0]?.innings[0]).toMatchObject({ team: "Pakistan", runs: 180, wickets: 5, overs: "20" });
    expect(request).toHaveBeenCalledOnce();
    vi.unstubAllEnvs();
  });

  it("returns a setup state when no provider key is configured", async () => {
    resetLiveCricketCache();
    vi.stubEnv("CRICKET_API_KEY", "");
    const result = await getLiveCricketMatches(vi.fn<typeof fetch>());
    expect(result.available).toBe(false);
    expect(result.matches).toEqual([]);
    expect(result.message).toMatch(/CRICKET_API_KEY/);
    vi.unstubAllEnvs();
  });
});
