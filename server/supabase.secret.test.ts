import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { createProMovieVideoUploadTicket, ensureProMovieAssetBucket, PROMOVIE_DIRECT_VIDEO_LIMIT_BYTES, PRO_MOVIE_SUPABASE_URL, supabaseAdmin, uploadProMovieAsset } from "./supabase";
import { createCategory, deleteCategory } from "./db";
import { canDirectlyUploadLocalVideo, CURRENT_DIRECT_VIDEO_LIMIT_BYTES } from "../client/src/lib/mediaUpload";

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

  it("accepts the configured browser publishable key at the Supabase auth settings endpoint", async () => {
    const url = "https://iwhsbvrrakutsodsvjbt.supabase.co";
    const key = "sb_publishable_eCMoulv4XTyKE6gvBhGRlQ_LBwip4NF";
    const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key! } });
    expect(response.ok).toBe(true);
  }, 15_000);

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

  it("uploads a small video directly with the standard signed-upload method and removes it afterward", async () => {
    const ticket = await createProMovieVideoUploadTicket({ ownerId: 0, fileName: "standard-upload-test.mp4", contentType: "video/mp4", size: 16 });
    const browserStorage = createClient("https://iwhsbvrrakutsodsvjbt.supabase.co", "sb_publishable_eCMoulv4XTyKE6gvBhGRlQ_LBwip4NF", { auth: { persistSession: false, autoRefreshToken: false } });
    try {
      const { error } = await browserStorage.storage.from(ticket.bucket).uploadToSignedUrl(ticket.path, ticket.token, new Blob(["test video bytes"], { type: "video/mp4" }), { contentType: "video/mp4" });
      expect(error).toBeNull();
      expect(ticket.publicUrl).toMatch(/^https:\/\/iwhsbvrrakutsodsvjbt\.supabase\.co\/storage\/v1\/object\/public\/promovie-assets\/videos\//);
    } finally {
      await supabaseAdmin.storage.from(ticket.bucket).remove([ticket.path]);
    }
  }, 20_000);

  it("allows local video selection through 50 MB and routes larger episode files to an external URL", () => {
    expect(canDirectlyUploadLocalVideo(CURRENT_DIRECT_VIDEO_LIMIT_BYTES)).toBe(true);
    expect(canDirectlyUploadLocalVideo(CURRENT_DIRECT_VIDEO_LIMIT_BYTES + 1)).toBe(false);
    expect(canDirectlyUploadLocalVideo(0)).toBe(false);
  });

  it("issues a signed-upload ticket at 50 MB and rejects larger local episode files with external-link guidance", async () => {
    const ticket = await createProMovieVideoUploadTicket({
      ownerId: 0,
      fileName: "fifty-megabyte-boundary.mp4",
      contentType: "video/mp4",
      size: PROMOVIE_DIRECT_VIDEO_LIMIT_BYTES,
    });
    expect(ticket.publicUrl).toMatch(/^https:\/\/iwhsbvrrakutsodsvjbt\.supabase\.co\/storage\/v1\/object\/public\/promovie-assets\/videos\//);
    await expect(createProMovieVideoUploadTicket({
      ownerId: 0,
      fileName: "over-fifty-megabyte-boundary.mp4",
      contentType: "video/mp4",
      size: PROMOVIE_DIRECT_VIDEO_LIMIT_BYTES + 1,
    })).rejects.toThrow(/paste a public HTTPS video URL instead/i);
    await supabaseAdmin.storage.from(ticket.bucket).remove([ticket.path]);
  }, 20_000);
});
