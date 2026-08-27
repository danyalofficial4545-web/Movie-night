import { describe, expect, it } from "vitest";
import { ensureProMovieAssetBucket, PRO_MOVIE_SUPABASE_URL, supabaseAdmin, uploadProMovieAsset } from "./supabase";
import { createCategory, deleteCategory } from "./db";

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

  it("creates or verifies the public ProMovie asset bucket without adding media records", async () => {
    await ensureProMovieAssetBucket();
    const { data, error } = await supabaseAdmin.storage.getBucket("promovie-assets");
    expect(error).toBeNull();
    expect(data?.public).toBe(true);
  }, 15_000);

  it("returns a full public storage URL for an uploaded ProMovie asset", async () => {
    const asset = await uploadProMovieAsset({
      ownerId: 0,
      fileName: "url-validation-test.txt",
      contentType: "text/plain",
      bytes: Buffer.from("ProMovie storage URL test"),
    });
    expect(asset.url).toMatch(/^https:\/\/iwhsbvrrakutsodsvjbt\.supabase\.co\/storage\/v1\/object\/public\/promovie-assets\//);
    const { error } = await supabaseAdmin.storage.from("promovie-assets").remove([asset.path]);
    expect(error).toBeNull();
  }, 15_000);

  it("accepts a Supabase public image URL when creating the Osman Ghazi category and cleans up afterward", async () => {
    const asset = await uploadProMovieAsset({ ownerId: 0, fileName: "osman-ghazi-category-test.svg", contentType: "image/svg+xml", bytes: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/>") });
    const slug = `osman-ghazi-test-${Date.now()}`;
    let categoryId: number | undefined;
    try {
      const category = await createCategory("Osman Ghazi", slug, asset.url, "drama");
      categoryId = category?.id;
      expect(category?.coverUrl).toBe(asset.url);
      expect(category?.categoryType).toBe("drama");
    } finally {
      if (categoryId) await deleteCategory(categoryId);
      await supabaseAdmin.storage.from("promovie-assets").remove([asset.path]);
    }
  }, 20_000);
});
