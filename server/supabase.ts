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
