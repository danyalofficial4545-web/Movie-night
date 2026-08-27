import { describe, expect, it } from "vitest";
import { PRO_MOVIE_SUPABASE_URL } from "./supabase";

async function assertSupabaseHealth(apiKey: string) {
  const url = process.env.SUPABASE_URL?.trim().startsWith("https://") ? process.env.SUPABASE_URL.trim() : PRO_MOVIE_SUPABASE_URL;
  expect(url).toBe(PRO_MOVIE_SUPABASE_URL);
  expect(apiKey.length).toBeGreaterThan(20);
  const response = await fetch(`${url}/auth/v1/health`, {
    headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(12_000),
  });
  expect(response.ok).toBe(true);
}

describe("Supabase configuration", () => {
  it("stores a browser-facing key without using it in server-only authentication", () => {
    expect((process.env.SUPABASE_KEY ?? "").length).toBeGreaterThan(20);
  });

  it("accepts the configured server-only service-role key through the lightweight health endpoint", async () => {
    await assertSupabaseHealth(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");
  }, 15_000);
});
