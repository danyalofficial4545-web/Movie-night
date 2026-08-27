import { createClient } from "@supabase/supabase-js";

export const PRO_MOVIE_SUPABASE_URL = "https://iwhsbvrrakutsodsvjbt.supabase.co";
const configuredUrl = process.env.SUPABASE_URL?.trim();
const supabaseUrl = configuredUrl?.startsWith("https://") ? configuredUrl : PRO_MOVIE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  throw new Error("Supabase environment variables are required for ProMovie.");
}

// All authentication calls are made only from the ProMovie server. The service-role
// client is never exposed to browser code and keeps the server functional while a
// separate browser publishable key is corrected in Supabase.
export const supabaseAuth = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const PROMOVIE_ASSET_BUCKET = "promovie-assets";
export const PROMOVIE_DIRECT_VIDEO_LIMIT_BYTES = 50 * 1024 * 1024;
let storageReady: Promise<void> | null = null;

export async function ensureProMovieAssetBucket() {
  if (!storageReady) {
    storageReady = (async () => {
      const { data: existing, error: lookupError } = await supabaseAdmin.storage.getBucket(PROMOVIE_ASSET_BUCKET);
      if (lookupError || !existing) {
        const { error } = await supabaseAdmin.storage.createBucket(PROMOVIE_ASSET_BUCKET, { public: true, fileSizeLimit: String(PROMOVIE_DIRECT_VIDEO_LIMIT_BYTES) });
        if (error && !/already exists|duplicate/i.test(error.message)) throw error;
      }
    })();
  }
  return storageReady;
}

export async function uploadProMovieAsset(input: { ownerId: number; fileName: string; contentType: string; bytes: Buffer }) {
  await ensureProMovieAssetBucket();
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `uploads/${input.ownerId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabaseAdmin.storage.from(PROMOVIE_ASSET_BUCKET).upload(path, input.bytes, {
    contentType: input.contentType,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabaseAdmin.storage.from(PROMOVIE_ASSET_BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export async function createProMovieVideoUploadTicket(input: { ownerId: number; fileName: string; contentType: string; size: number }) {
  if (input.size > PROMOVIE_DIRECT_VIDEO_LIMIT_BYTES) {
    throw new Error("This ProMovie Storage bucket accepts local videos up to 50 MB. For a larger episode, paste a public HTTPS video URL instead.");
  }
  await ensureProMovieAssetBucket();
  const { data: bucket, error: bucketError } = await supabaseAdmin.storage.getBucket(PROMOVIE_ASSET_BUCKET);
  if (bucketError || !bucket) throw bucketError ?? new Error("Could not inspect the ProMovie asset bucket.");
  const configuredLimit = Number(bucket.file_size_limit ?? 0);
  if (configuredLimit > 0 && input.size > configuredLimit) {
    throw new Error(`This Supabase bucket currently permits files up to ${Math.floor(configuredLimit / 1024 / 1024)} MB. Increase the bucket or project file-size limit before uploading this video.`);
  }
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `videos/${input.ownerId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  const { data, error } = await supabaseAdmin.storage.from(PROMOVIE_ASSET_BUCKET).createSignedUploadUrl(path, { upsert: false });
  if (error || !data) throw error ?? new Error("Could not create a direct upload ticket.");
  const { data: publicData } = supabaseAdmin.storage.from(PROMOVIE_ASSET_BUCKET).getPublicUrl(path);
  return {
    bucket: PROMOVIE_ASSET_BUCKET,
    path,
    token: data.token,
    publicUrl: publicData.publicUrl,
  };
}
