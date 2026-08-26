import { TRPCError } from "@trpc/server";
import { ensureProMovieUser, isDesignatedAdmin } from "./db";
import { supabaseAuth } from "./supabase";

export async function requireProMovieUser(token: string) {
  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in to continue." });
  const profile = await ensureProMovieUser({
    openId: data.user.id,
    email: data.user.email,
    name: data.user.user_metadata?.full_name ?? null,
    mobile: (data.user.phone || data.user.user_metadata?.mobile) ?? null,
    avatarUrl: data.user.user_metadata?.avatar_url ?? null,
  });
  if (!profile || profile.isBlocked) throw new TRPCError({ code: "FORBIDDEN", message: "This account is unavailable." });
  return profile;
}

export async function requireProMovieAdmin(token: string) {
  const profile = await requireProMovieUser(token);
  if (profile.role !== "admin" || !isDesignatedAdmin(profile.email, profile.mobile)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Administrator access is required." });
  }
  return profile;
}
