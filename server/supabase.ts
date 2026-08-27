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

const PROMOVIE_ASSET_BUCKET = "promovie-assets";
let storageReady: Promise<void> | null = null;

export async function ensureProMovieAssetBucket() {
  if (!storageReady) {
    storageReady = (async () => {
      const { error } = await supabaseAdmin.storage.createBucket(PROMOVIE_ASSET_BUCKET, {
        public: true,
        fileSizeLimit: "52428800",
      });
      if (error && !/already exists|duplicate/i.test(error.message)) throw error;
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
