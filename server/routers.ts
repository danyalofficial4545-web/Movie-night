import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import {
  createCategory,
  createDownload,
  createMovie,
  createPendingEmailUser,
  deleteCategory,
  deleteMovie,
  getAdminMetrics,
  getMovie,
  getUserByMobile,
  grantWatchReward,
  isAdminEmail,
  isDesignatedAdmin,
  listAllMovies,
  listCategories,
  listProfileData,
  listPublishedCatalog,
  listUsersForAdmin,
  setUserBlocked,
} from "./db";
import { requireProMovieAdmin, requireProMovieUser } from "./promovieAuth";
import { storagePut } from "./storage";
import { supabaseAdmin, supabaseAuth } from "./supabase";
import { publicProcedure, router } from "./_core/trpc";

const tokenInput = z.object({ token: z.string().min(20) });
const mobileSchema = z.string().trim().min(8).max(32);
const slugify = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  promovie: router({
    auth: router({
      signUp: publicProcedure.input(z.object({
        fullName: z.string().trim().min(2).max(120), email: z.string().trim().email(), mobile: mobileSchema, password: z.string().min(8).max(128),
      })).mutation(async ({ input }) => {
        if (await getUserByMobile(input.mobile)) throw new TRPCError({ code: "CONFLICT", message: "One mobile number can only be used for one account." });
        if (isAdminEmail(input.email) && !isDesignatedAdmin(input.email, input.mobile)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "The designated administrator email must use its configured mobile number." });
        }
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: input.email,
          password: input.password,
          email_confirm: false,
          user_metadata: { full_name: input.fullName, mobile: input.mobile },
        });
        if (error || !data.user) throw new TRPCError({ code: "BAD_REQUEST", message: error?.message ?? "Unable to create this account." });
        try {
          await createPendingEmailUser({ openId: data.user.id, email: input.email, name: input.fullName, mobile: input.mobile });
        } catch (dbError) {
          throw new TRPCError({ code: "CONFLICT", message: "Unable to reserve this mobile number. Please use a different number." });
        }
        const otp = await supabaseAuth.auth.signInWithOtp({ email: input.email, options: { shouldCreateUser: false } });
        if (otp.error) throw new TRPCError({ code: "BAD_REQUEST", message: otp.error.message });
        return { requiresOtp: true, email: input.email };
      }),
      verifyOtp: publicProcedure.input(z.object({ email: z.string().trim().email(), code: z.string().trim().length(6) })).mutation(async ({ input }) => {
        const { data, error } = await supabaseAuth.auth.verifyOtp({ email: input.email, token: input.code, type: "email" });
        if (error || !data.session) throw new TRPCError({ code: "BAD_REQUEST", message: error?.message ?? "Invalid verification code." });
        const profile = await requireProMovieUser(data.session.access_token);
        return { token: data.session.access_token, profile };
      }),
      signIn: publicProcedure.input(z.object({ email: z.string().email(), password: z.string().min(8) })).mutation(async ({ input }) => {
        const { data, error } = await supabaseAuth.auth.signInWithPassword({ email: input.email, password: input.password });
        if (error || !data.session) throw new TRPCError({ code: "UNAUTHORIZED", message: error?.message ?? "Invalid email or password." });
        if (!data.user.email_confirmed_at) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Verify your email address before signing in." });
        }
        const profile = await requireProMovieUser(data.session.access_token);
        return { token: data.session.access_token, profile };
      }),
      me: publicProcedure.input(tokenInput).query(({ input }) => requireProMovieUser(input.token)),
    }),
    catalog: publicProcedure.input(tokenInput).query(async ({ input }) => {
      await requireProMovieUser(input.token);
      return listPublishedCatalog();
    }),
    profile: publicProcedure.input(tokenInput).query(async ({ input }) => {
      const profile = await requireProMovieUser(input.token);
      return { profile, ...(await listProfileData(profile.id)) };
    }),
    movie: publicProcedure.input(tokenInput.extend({ movieId: z.number().int().positive() })).query(async ({ input }) => {
      await requireProMovieUser(input.token);
      const movie = await getMovie(input.movieId);
      if (!movie || !movie.isPublished) throw new TRPCError({ code: "NOT_FOUND", message: "Movie unavailable." });
      return movie;
    }),
    rewardWatch: publicProcedure.input(tokenInput.extend({ movieId: z.number().int().positive(), activeSeconds: z.number().int().min(0).max(3600) })).mutation(async ({ input }) => {
      const profile = await requireProMovieUser(input.token);
      const movie = await getMovie(input.movieId);
      if (!movie || !movie.isPublished) throw new TRPCError({ code: "NOT_FOUND", message: "Movie unavailable." });
      return grantWatchReward({ userId: profile.id, movieId: movie.id, watchedSeconds: input.activeSeconds });
    }),
    download: publicProcedure.input(tokenInput.extend({ movieId: z.number().int().positive() })).mutation(async ({ input }) => {
      const profile = await requireProMovieUser(input.token);
      return createDownload({ userId: profile.id, movieId: input.movieId });
    }),
    admin: router({
      dashboard: publicProcedure.input(tokenInput).query(async ({ input }) => { await requireProMovieAdmin(input.token); return getAdminMetrics(); }),
      categories: publicProcedure.input(tokenInput).query(async ({ input }) => { await requireProMovieAdmin(input.token); return listCategories(); }),
      createCategory: publicProcedure.input(tokenInput.extend({ name: z.string().trim().min(2).max(120) })).mutation(async ({ input }) => {
        await requireProMovieAdmin(input.token); const slug = slugify(input.name);
        if (!slug) throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a valid category name." });
        return createCategory(input.name, slug);
      }),
      deleteCategory: publicProcedure.input(tokenInput.extend({ id: z.number().int().positive() })).mutation(async ({ input }) => { await requireProMovieAdmin(input.token); await deleteCategory(input.id); return { success: true }; }),
      movies: publicProcedure.input(tokenInput).query(async ({ input }) => { await requireProMovieAdmin(input.token); return listAllMovies(); }),
      uploadAsset: publicProcedure.input(tokenInput.extend({
        fileName: z.string().min(1).max(180),
        contentType: z.string().min(3).max(120),
        base64: z.string().min(1).max(20_000_000),
      })).mutation(async ({ input }) => {
        const admin = await requireProMovieAdmin(input.token);
        const bytes = Buffer.from(input.base64, "base64");
        if (bytes.byteLength > 12 * 1024 * 1024) {
          throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "For files above 12 MB, use a secure hosted video link." });
        }
        const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
        return storagePut(`promovie/${admin.id}/media/${Date.now()}-${safeName}`, bytes, input.contentType);
      }),
      createMovie: publicProcedure.input(tokenInput.extend({
        categoryId: z.number().int().positive(), title: z.string().trim().min(1).max(240), description: z.string().trim().min(1),
        thumbnailUrl: z.string().url().optional().or(z.literal("")), bannerUrl: z.string().url().optional().or(z.literal("")), videoUrl: z.string().url().optional().or(z.literal("")),
        languageTags: z.array(z.enum(["Urdu", "English", "Hindi"])).min(1), quality: z.enum(["720p", "1080p"]), releaseYear: z.number().int().min(1888).max(2100), downloadCost: z.number().int().min(0).default(1000), isPublished: z.boolean().default(false),
      })).mutation(async ({ input }) => {
        await requireProMovieAdmin(input.token);
        const { token: _token, thumbnailUrl, bannerUrl, videoUrl, ...movie } = input;
        return { id: await createMovie({ ...movie, thumbnailUrl: thumbnailUrl || null, bannerUrl: bannerUrl || null, videoUrl: videoUrl || null }) };
      }),
      deleteMovie: publicProcedure.input(tokenInput.extend({ id: z.number().int().positive() })).mutation(async ({ input }) => { await requireProMovieAdmin(input.token); await deleteMovie(input.id); return { success: true }; }),
      users: publicProcedure.input(tokenInput).query(async ({ input }) => { await requireProMovieAdmin(input.token); return listUsersForAdmin(); }),
      blockUser: publicProcedure.input(tokenInput.extend({ id: z.number().int().positive(), isBlocked: z.boolean() })).mutation(async ({ input }) => {
        const admin = await requireProMovieAdmin(input.token);
        if (admin.id === input.id) throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot block your own administrator account." });
        await setUserBlocked(input.id, input.isBlocked);
        return { success: true };
      }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
