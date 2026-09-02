import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import {
  createCategory,
  createDownload,
  createEpisode,
  createWithdrawalRequest,
  creditReferralRewards,
  createMovie,
  createPendingEmailUser,
  deleteCategory,
  deleteEpisode,
  deleteMovie,
  getAdminMetrics,
  getCategory,
  getEpisode,
  getMovie,
  getUserById,
  getUserByMobile,
  grantWatchReward,
  isAdminEmail,
  isDesignatedAdmin,
  listAllMovies,
  listCategories,
  listEpisodesForMovie,
  listProfileData,
  listPublishedCatalog,
  listPublishedMoviesForCategory,
  listSubCategories,
  listUsersForAdmin,
  listWithdrawalRequests,
  reviewWithdrawalRequest,
  setUserBlocked,
} from "./db";
import { requireProMovieAdmin, requireProMovieUser } from "./promovieAuth";
import { createProMovieVideoUploadTicket, supabaseAdmin, supabaseAuth, uploadProMovieAsset } from "./supabase";
import { startPlaybackSession, verifyPlaybackHeartbeat } from "./playbackSessions";
import { resolveVideoPlaybackLink } from "./videoLinkResolver";
import { getLiveCricketMatches } from "./cricket";
import { publicProcedure, router } from "./_core/trpc";

const tokenInput = z.object({ token: z.string().min(20) });
const mobileSchema = z.string().trim().min(8).max(32);
const publicHttpsUrlSchema = z.string().trim().url().refine(value => value.startsWith("https://"), "Use a public HTTPS URL.");
const optionalPublicHttpsUrlSchema = publicHttpsUrlSchema.optional().or(z.literal(""));
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
        fullName: z.string().trim().min(2).max(120), email: z.string().trim().email(), mobile: mobileSchema, password: z.string().min(8).max(128), referrerId: z.number().int().positive().optional(),
      })).mutation(async ({ input }) => {
        if (await getUserByMobile(input.mobile)) throw new TRPCError({ code: "CONFLICT", message: "One mobile number can only be used for one account." });
        if (isAdminEmail(input.email) && !isDesignatedAdmin(input.email, input.mobile)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "The designated administrator email must use its configured mobile number." });
        }
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: input.email,
          password: input.password,
          email_confirm: true,
          user_metadata: { full_name: input.fullName, mobile: input.mobile },
        });
        if (error || !data.user) throw new TRPCError({ code: "BAD_REQUEST", message: error?.message ?? "Unable to create this account." });
        try {
          const referrer = input.referrerId ? await getUserById(input.referrerId) : undefined;
          await createPendingEmailUser({ openId: data.user.id, email: input.email, name: input.fullName, mobile: input.mobile, referrerId: referrer?.id });
        } catch (dbError) {
          throw new TRPCError({ code: "CONFLICT", message: "Unable to reserve this mobile number. Please use a different number." });
        }
        const { data: sessionData, error: signInError } = await supabaseAuth.auth.signInWithPassword({ email: input.email, password: input.password });
        if (signInError || !sessionData.session) throw new TRPCError({ code: "BAD_REQUEST", message: signInError?.message ?? "Account created, but automatic sign-in could not be completed." });
        const profile = await requireProMovieUser(sessionData.session.access_token);
        await creditReferralRewards({ newUserId: profile.id, referrerId: profile.referredByUserId });
        return { token: sessionData.session.access_token, profile };
      }),
      signIn: publicProcedure.input(z.object({ email: z.string().email(), password: z.string().min(8) })).mutation(async ({ input }) => {
        const { data, error } = await supabaseAuth.auth.signInWithPassword({ email: input.email, password: input.password });
        if (error || !data.session) throw new TRPCError({ code: "UNAUTHORIZED", message: error?.message ?? "Invalid email or password." });
        const profile = await requireProMovieUser(data.session.access_token);
        return { token: data.session.access_token, profile };
      }),
      me: publicProcedure.input(tokenInput).query(({ input }) => requireProMovieUser(input.token)),
    }),
    catalog: publicProcedure.input(tokenInput.extend({ categoryType: z.enum(["movie", "drama"]).optional() })).query(async ({ input }) => {
      await requireProMovieUser(input.token);
      return listPublishedCatalog(input.categoryType);
    }),
    category: publicProcedure.input(tokenInput.extend({ categoryId: z.number().int().positive() })).query(async ({ input }) => {
      await requireProMovieUser(input.token);
      const category = await getCategory(input.categoryId);
      if (!category) throw new TRPCError({ code: "NOT_FOUND", message: "Category unavailable." });
      const subCategories = await listSubCategories(category.id);
      return { category, subCategories, movies: subCategories.length ? [] : await listPublishedMoviesForCategory(category.id) };
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
    movieFolder: publicProcedure.input(tokenInput.extend({ movieId: z.number().int().positive() })).query(async ({ input }) => {
      await requireProMovieUser(input.token);
      const movie = await getMovie(input.movieId);
      if (!movie || !movie.isPublished) throw new TRPCError({ code: "NOT_FOUND", message: "Movie unavailable." });
      return { movie, episodes: await listEpisodesForMovie(movie.id, true) };
    }),
    episode: publicProcedure.input(tokenInput.extend({ episodeId: z.number().int().positive() })).query(async ({ input }) => {
      await requireProMovieUser(input.token);
      const episode = await getEpisode(input.episodeId);
      if (!episode || !episode.isPublished) throw new TRPCError({ code: "NOT_FOUND", message: "Episode unavailable." });
      const movie = await getMovie(episode.movieId);
      if (!movie || !movie.isPublished) throw new TRPCError({ code: "NOT_FOUND", message: "Movie unavailable." });
      return { movie, episode };
    }),
    playbackSource: publicProcedure.input(tokenInput.extend({ movieId: z.number().int().positive(), episodeId: z.number().int().positive().optional() })).query(async ({ input }) => {
      await requireProMovieUser(input.token);
      const movie = await getMovie(input.movieId);
      if (!movie || !movie.isPublished) throw new TRPCError({ code: "NOT_FOUND", message: "Movie unavailable." });
      const episode = input.episodeId ? await getEpisode(input.episodeId) : undefined;
      if (input.episodeId && (!episode || !episode.isPublished || episode.movieId !== movie.id)) throw new TRPCError({ code: "NOT_FOUND", message: "Episode unavailable." });
      const sourceUrl = episode?.videoUrl || movie.videoUrl;
      if (!sourceUrl) return { sourceUrl: "", originalUrl: "", provider: "direct" as const, resolved: false };
      const resolved = await resolveVideoPlaybackLink(sourceUrl);
      return { sourceUrl: resolved.playbackUrl, originalUrl: resolved.originalUrl, provider: resolved.provider, resolved: resolved.resolved };
    }),
    startWatch: publicProcedure.input(tokenInput.extend({ movieId: z.number().int().positive(), episodeId: z.number().int().positive().optional() })).mutation(async ({ input }) => {
      const profile = await requireProMovieUser(input.token);
      const movie = await getMovie(input.movieId);
      if (!movie || !movie.isPublished) throw new TRPCError({ code: "NOT_FOUND", message: "Movie unavailable." });
      const episode = input.episodeId ? await getEpisode(input.episodeId) : undefined;
      if (input.episodeId && (!episode || !episode.isPublished || episode.movieId !== movie.id)) throw new TRPCError({ code: "NOT_FOUND", message: "Episode unavailable." });
      return startPlaybackSession({ userId: profile.id, movieId: movie.id, episodeId: episode?.id });
    }),
    rewardWatch: publicProcedure.input(tokenInput.extend({ movieId: z.number().int().positive(), episodeId: z.number().int().positive().optional(), ticket: z.string().uuid(), activeSeconds: z.number().int().min(60).max(60) })).mutation(async ({ input }) => {
      const profile = await requireProMovieUser(input.token);
      const movie = await getMovie(input.movieId);
      if (!movie || !movie.isPublished) throw new TRPCError({ code: "NOT_FOUND", message: "Movie unavailable." });
      const episode = input.episodeId ? await getEpisode(input.episodeId) : undefined;
      if (input.episodeId && (!episode || !episode.isPublished || episode.movieId !== movie.id)) throw new TRPCError({ code: "NOT_FOUND", message: "Episode unavailable." });
      if (!verifyPlaybackHeartbeat({ ticket: input.ticket, userId: profile.id, movieId: movie.id, episodeId: episode?.id }).eligible) return { earned: 0, rateLimited: true };
      return grantWatchReward({ userId: profile.id, movieId: movie.id, episodeId: episode?.id, episodeLabel: episode ? `Episode ${episode.episodeNumber}: ${episode.title}` : movie.title, watchedSeconds: input.activeSeconds });
    }),
    download: publicProcedure.input(tokenInput.extend({ movieId: z.number().int().positive() })).mutation(async ({ input }) => {
      const profile = await requireProMovieUser(input.token);
      return createDownload({ userId: profile.id, movieId: input.movieId });
    }),
    cricket: router({
      liveMatches: publicProcedure.input(tokenInput).query(async ({ input }) => {
        await requireProMovieUser(input.token);
        return getLiveCricketMatches();
      }),
    }),
    withdrawal: router({
      create: publicProcedure.input(tokenInput.extend({ method: z.enum(["easypaisa", "jazzcash"]), accountName: z.string().trim().min(2).max(160), accountNumber: z.string().trim().min(8).max(32), coins: z.number().int().min(1000) })).mutation(async ({ input }) => {
        const profile = await requireProMovieUser(input.token);
        return createWithdrawalRequest({ userId: profile.id, method: input.method, accountName: input.accountName, accountNumber: input.accountNumber, coins: input.coins });
      }),
    }),
    admin: router({
      dashboard: publicProcedure.input(tokenInput).query(async ({ input }) => { await requireProMovieAdmin(input.token); return getAdminMetrics(); }),
      categories: publicProcedure.input(tokenInput).query(async ({ input }) => { await requireProMovieAdmin(input.token); return listCategories(); }),
      createCategory: publicProcedure.input(tokenInput.extend({ name: z.string().trim().min(2).max(120), categoryType: z.enum(["movie", "drama"]).optional().default("movie"), parentId: z.number().int().positive().optional(), coverUrl: optionalPublicHttpsUrlSchema })).mutation(async ({ input }) => {
        await requireProMovieAdmin(input.token); const slug = slugify(input.name);
        if (!slug) throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a valid category name." });
        const parent = input.parentId ? await getCategory(input.parentId) : undefined;
        if (input.parentId && !parent) throw new TRPCError({ code: "NOT_FOUND", message: "Parent category unavailable." });
        const nestedSlug = parent ? `${parent.slug}-${slug}` : slug;
        return createCategory(input.name, nestedSlug, input.coverUrl || null, parent?.categoryType ?? input.categoryType, parent?.id);
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
        try {
          return await uploadProMovieAsset({ ownerId: admin.id, fileName: input.fileName, contentType: input.contentType, bytes });
        } catch (error) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? `Upload failed: ${error.message}` : "Upload failed." });
        }
      }),
      createVideoUpload: publicProcedure.input(tokenInput.extend({
        fileName: z.string().min(1).max(180),
        contentType: z.string().min(3).max(120),
        size: z.number().int().positive().max(2 * 1024 * 1024 * 1024),
      })).mutation(async ({ input }) => {
        const admin = await requireProMovieAdmin(input.token);
        try {
          return await createProMovieVideoUploadTicket({ ownerId: admin.id, fileName: input.fileName, contentType: input.contentType, size: input.size });
        } catch (error) {
          throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Could not start the direct video upload." });
        }
      }),
      resolveVideoLink: publicProcedure.input(tokenInput.extend({ sourceUrl: publicHttpsUrlSchema })).query(async ({ input }) => {
        await requireProMovieAdmin(input.token);
        const resolved = await resolveVideoPlaybackLink(input.sourceUrl);
        return { sourceUrl: resolved.playbackUrl, originalUrl: resolved.originalUrl, provider: resolved.provider, resolved: resolved.resolved };
      }),
      createMovie: publicProcedure.input(tokenInput.extend({
        categoryId: z.number().int().positive(), title: z.string().trim().min(1).max(240), description: z.string().trim().min(1),
        contentType: z.enum(["movie", "series"]).default("movie"), posterUrl: optionalPublicHttpsUrlSchema, thumbnailUrl: optionalPublicHttpsUrlSchema, bannerUrl: optionalPublicHttpsUrlSchema, videoUrl: optionalPublicHttpsUrlSchema,
        languageTags: z.array(z.enum(["Urdu", "English", "Hindi"])).min(1), quality: z.enum(["720p", "1080p"]), releaseYear: z.number().int().min(1888).max(2100), downloadCost: z.number().int().min(0).default(1000), isPublished: z.boolean().default(false),
      })).mutation(async ({ input }) => {
        await requireProMovieAdmin(input.token);
        const { token: _token, posterUrl, thumbnailUrl, bannerUrl, videoUrl, ...movie } = input;
        return { id: await createMovie({ ...movie, posterUrl: posterUrl || null, thumbnailUrl: thumbnailUrl || null, bannerUrl: bannerUrl || null, videoUrl: videoUrl || null }) };
      }),
      deleteMovie: publicProcedure.input(tokenInput.extend({ id: z.number().int().positive() })).mutation(async ({ input }) => { await requireProMovieAdmin(input.token); await deleteMovie(input.id); return { success: true }; }),
      episodes: publicProcedure.input(tokenInput.extend({ movieId: z.number().int().positive() })).query(async ({ input }) => { await requireProMovieAdmin(input.token); return listEpisodesForMovie(input.movieId); }),
      createEpisode: publicProcedure.input(tokenInput.extend({
        movieId: z.number().int().positive(), episodeNumber: z.number().int().positive(), title: z.string().trim().min(1).max(240), thumbnailUrl: optionalPublicHttpsUrlSchema, videoUrl: optionalPublicHttpsUrlSchema, languageTags: z.array(z.enum(["Urdu", "English", "Hindi"])).min(1), quality: z.enum(["144p", "240p", "360p", "480p", "720p", "1080p"]), qualityVariants: z.record(z.string(), publicHttpsUrlSchema).optional(), isPublished: z.boolean().default(false),
      })).mutation(async ({ input }) => { await requireProMovieAdmin(input.token); const { token: _token, videoUrl, thumbnailUrl, ...episode } = input; return { id: await createEpisode({ ...episode, videoUrl: videoUrl || null, thumbnailUrl: thumbnailUrl || null }) }; }),
      deleteEpisode: publicProcedure.input(tokenInput.extend({ id: z.number().int().positive() })).mutation(async ({ input }) => { await requireProMovieAdmin(input.token); await deleteEpisode(input.id); return { success: true }; }),
      users: publicProcedure.input(tokenInput).query(async ({ input }) => { await requireProMovieAdmin(input.token); return listUsersForAdmin(); }),
      withdrawals: publicProcedure.input(tokenInput).query(async ({ input }) => { await requireProMovieAdmin(input.token); return listWithdrawalRequests(); }),
      reviewWithdrawal: publicProcedure.input(tokenInput.extend({ requestId: z.number().int().positive(), decision: z.enum(["approved", "rejected"]), reviewerNote: z.string().trim().max(255).optional() })).mutation(async ({ input }) => {
        const admin = await requireProMovieAdmin(input.token);
        return reviewWithdrawalRequest({ requestId: input.requestId, adminId: admin.id, decision: input.decision, reviewerNote: input.reviewerNote });
      }),
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
