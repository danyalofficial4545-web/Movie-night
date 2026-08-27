import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  categories,
  downloads,
  episodes,
  InsertUser,
  movies,
  users,
  walletTransactions,
  watchSessions,
  withdrawalRequests,
} from "../drizzle/schema";

export const ADMIN_EMAIL = "muhammaddanyal4545@gmail.com";
export const ADMIN_MOBILE = "03311332670";

let database: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!database && process.env.DATABASE_URL) database = drizzle(process.env.DATABASE_URL);
  return database;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  return db;
}

export function isAdminEmail(email?: string | null) {
  return email?.trim().toLowerCase() === ADMIN_EMAIL;
}

export function isDesignatedAdmin(email?: string | null, mobile?: string | null) {
  return isAdminEmail(email) && mobile?.trim() === ADMIN_MOBILE;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required.");
  const db = await requireDb();
  await db.insert(users).values(user).onDuplicateKeyUpdate({
    set: {
      name: user.name ?? null,
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? null,
      role: isAdminEmail(user.email) ? "admin" : "user",
      lastSignedIn: new Date(),
    },
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await requireDb();
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

export async function getUserByMobile(mobile: string) {
  const db = await requireDb();
  return (await db.select().from(users).where(eq(users.mobile, mobile)).limit(1))[0];
}

export async function getUserById(id: number) {
  const db = await requireDb();
  return (await db.select().from(users).where(eq(users.id, id)).limit(1))[0];
}

export async function createPendingEmailUser(input: { openId: string; email: string; name: string; mobile: string; referrerId?: number | null }) {
  const db = await requireDb();
  await db.insert(users).values({
    openId: input.openId,
    email: input.email,
    name: input.name,
    mobile: input.mobile,
    loginMethod: "supabase-email",
    role: isAdminEmail(input.email) ? "admin" : "user",
    referralCode: `pm-${input.openId.slice(-12)}`,
    referredByUserId: input.referrerId ?? null,
  });
}

export async function ensureProMovieUser(input: { openId: string; email?: string | null; name?: string | null; mobile?: string | null; avatarUrl?: string | null }) {
  const db = await requireDb();
  const role = isAdminEmail(input.email) ? "admin" : "user";
  await db.insert(users).values({
    openId: input.openId,
    email: input.email ?? null,
    name: input.name ?? null,
    mobile: input.mobile ?? null,
    avatarUrl: input.avatarUrl ?? null,
    loginMethod: "supabase",
    role,
    lastSignedIn: new Date(),
  }).onDuplicateKeyUpdate({
    set: {
      email: input.email ?? null,
      name: input.name ?? null,
      mobile: input.mobile ?? null,
      avatarUrl: input.avatarUrl ?? null,
      role,
      lastSignedIn: new Date(),
    },
  });
  return getUserByOpenId(input.openId);
}

export async function listPublishedCatalog(categoryType?: "movie" | "drama") {
  const db = await requireDb();
  const allCategories = categoryType
    ? await db.select().from(categories).where(eq(categories.categoryType, categoryType)).orderBy(categories.name)
    : await db.select().from(categories).orderBy(categories.name);
  const publishedMovies = await db.select().from(movies).where(eq(movies.isPublished, true)).orderBy(desc(movies.createdAt));
  return { categories: allCategories, movies: publishedMovies };
}

export async function listCategories() {
  const db = await requireDb();
  return db.select().from(categories).orderBy(categories.name);
}

export async function getCategory(id: number) {
  const db = await requireDb();
  return (await db.select().from(categories).where(eq(categories.id, id)).limit(1))[0];
}

export async function createCategory(name: string, slug: string, coverUrl?: string | null, categoryType: "movie" | "drama" = "movie") {
  const db = await requireDb();
  await db.insert(categories).values({ name, slug, coverUrl: coverUrl ?? null, categoryType });
  return (await db.select().from(categories).where(eq(categories.slug, slug)).limit(1))[0];
}

export async function deleteCategory(id: number) {
  const db = await requireDb();
  await db.delete(categories).where(eq(categories.id, id));
}

export async function listAllMovies() {
  const db = await requireDb();
  return db.select().from(movies).orderBy(desc(movies.createdAt));
}

export async function listPublishedMoviesForCategory(categoryId: number) {
  const db = await requireDb();
  return db.select().from(movies).where(and(eq(movies.categoryId, categoryId), eq(movies.isPublished, true))).orderBy(desc(movies.createdAt));
}

export async function createMovie(input: typeof movies.$inferInsert) {
  const db = await requireDb();
  const result = await db.insert(movies).values(input);
  return result[0].insertId;
}

export async function deleteMovie(id: number) {
  const db = await requireDb();
  await db.delete(movies).where(eq(movies.id, id));
}

export async function getMovie(id: number) {
  const db = await requireDb();
  return (await db.select().from(movies).where(eq(movies.id, id)).limit(1))[0];
}

export async function listEpisodesForMovie(movieId: number, publishedOnly = false) {
  const db = await requireDb();
  const condition = publishedOnly ? and(eq(episodes.movieId, movieId), eq(episodes.isPublished, true)) : eq(episodes.movieId, movieId);
  return db.select().from(episodes).where(condition).orderBy(episodes.episodeNumber);
}

export async function getEpisode(id: number) {
  const db = await requireDb();
  return (await db.select().from(episodes).where(eq(episodes.id, id)).limit(1))[0];
}

export async function createEpisode(input: typeof episodes.$inferInsert) {
  const db = await requireDb();
  const result = await db.insert(episodes).values(input);
  return result[0].insertId;
}

export async function deleteEpisode(id: number) {
  const db = await requireDb();
  await db.delete(episodes).where(eq(episodes.id, id));
}

export async function listProfileData(userId: number) {
  const db = await requireDb();
  const [transactions, watches, userDownloads, referrals, withdrawals] = await Promise.all([
    db.select().from(walletTransactions).where(eq(walletTransactions.userId, userId)).orderBy(desc(walletTransactions.createdAt)).limit(50),
    db.select().from(watchSessions).where(eq(watchSessions.userId, userId)).orderBy(desc(watchSessions.lastPlayedAt)).limit(50),
    db.select().from(downloads).where(eq(downloads.userId, userId)).orderBy(desc(downloads.createdAt)),
    db.select({ value: sql<number>`count(*)` }).from(users).where(eq(users.referredByUserId, userId)),
    db.select().from(withdrawalRequests).where(eq(withdrawalRequests.userId, userId)).orderBy(desc(withdrawalRequests.createdAt)),
  ]);
  return { transactions, watches, downloads: userDownloads, referralCount: Number(referrals[0]?.value ?? 0), withdrawals };
}

export async function grantWatchReward(input: { userId: number; movieId: number; episodeId?: number | null; episodeLabel?: string | null; watchedSeconds: number }) {
  const db = await requireDb();
  if (input.watchedSeconds < 60) return { earned: 0 };
  const episodeCondition = input.episodeId ? eq(watchSessions.episodeId, input.episodeId) : isNull(watchSessions.episodeId);
  const existing = (await db.select().from(watchSessions).where(and(eq(watchSessions.userId, input.userId), eq(watchSessions.movieId, input.movieId), episodeCondition)).limit(1))[0];
  if (existing?.lastRewardedAt && Date.now() - existing.lastRewardedAt.getTime() < 55_000) return { earned: 0, rateLimited: true };
  const wholeMinutes = 1;
  const earned = 50;
  const now = new Date();
  await db.transaction(async tx => {
    await tx.insert(walletTransactions).values({
      userId: input.userId,
      movieId: input.movieId,
      activity: "watched",
      coinsDelta: earned,
      note: `${input.episodeLabel ?? "Video"} · 1 active minute · earned 50 coins`,
    });
    await tx.insert(watchSessions).values({
      userId: input.userId,
      movieId: input.movieId,
      episodeId: input.episodeId ?? null,
      episodeLabel: input.episodeLabel ?? null,
      watchedSeconds: wholeMinutes * 60,
      coinsEarned: earned,
      lastPlayedAt: now,
      lastRewardedAt: now,
    }).onDuplicateKeyUpdate({
      set: {
        watchedSeconds: sql`${watchSessions.watchedSeconds} + ${wholeMinutes * 60}`,
        coinsEarned: sql`${watchSessions.coinsEarned} + ${earned}`,
        lastPlayedAt: now,
        lastRewardedAt: now,
      },
    });
    await tx.update(users).set({ coinBalance: sql`${users.coinBalance} + ${earned}` }).where(eq(users.id, input.userId));
  });
  return { earned };
}

export async function createDownload(input: { userId: number; movieId: number }) {
  const db = await requireDb();
  const [member, movie] = await Promise.all([
    (await db.select().from(users).where(eq(users.id, input.userId)).limit(1))[0],
    getMovie(input.movieId),
  ]);
  if (!member || !movie) throw new Error("Movie or user was not found.");
  if (member.coinBalance < movie.downloadCost) throw new Error("Watch more to earn coins.");
  await db.transaction(async tx => {
    await tx.insert(downloads).values(input);
    await tx.insert(walletTransactions).values({
      userId: input.userId,
      movieId: input.movieId,
      activity: "downloaded",
      coinsDelta: -movie.downloadCost,
      note: `Downloaded ${movie.title}`,
    });
    await tx.update(users).set({ coinBalance: sql`${users.coinBalance} - ${movie.downloadCost}` }).where(eq(users.id, input.userId));
  });
  return movie;
}

export async function creditReferralRewards(input: { newUserId: number; referrerId?: number | null }) {
  if (!input.referrerId || input.referrerId === input.newUserId) return { awarded: false };
  const db = await requireDb();
  const referrer = (await db.select().from(users).where(eq(users.id, input.referrerId)).limit(1))[0];
  if (!referrer) return { awarded: false };
  await db.transaction(async tx => {
    await tx.update(users).set({ coinBalance: sql`${users.coinBalance} + 200` }).where(eq(users.id, input.newUserId));
    await tx.update(users).set({ coinBalance: sql`${users.coinBalance} + 200`, referralCoinsEarned: sql`${users.referralCoinsEarned} + 200` }).where(eq(users.id, input.referrerId!));
    await tx.insert(walletTransactions).values([
      { userId: input.newUserId, activity: "referral_bonus", coinsDelta: 200, note: "Welcome referral reward" },
      { userId: input.referrerId!, activity: "referral_bonus", coinsDelta: 200, note: "Referral reward for a new member" },
    ]);
  });
  return { awarded: true };
}

export async function listUsersForAdmin() {
  const db = await requireDb();
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function setUserBlocked(id: number, isBlocked: boolean) {
  const db = await requireDb();
  await db.update(users).set({ isBlocked }).where(eq(users.id, id));
}

export async function getAdminMetrics() {
  const db = await requireDb();
  const [userCount, movieCount, categoryCount, walletSummary] = await Promise.all([
    db.select({ value: sql<number>`count(*)` }).from(users),
    db.select({ value: sql<number>`count(*)` }).from(movies),
    db.select({ value: sql<number>`count(*)` }).from(categories),
    db.select({ value: sql<number>`coalesce(sum(${walletTransactions.coinsDelta}), 0)` }).from(walletTransactions),
  ]);
  return {
    totalUsers: Number(userCount[0]?.value ?? 0),
    totalMovies: Number(movieCount[0]?.value ?? 0),
    totalCategories: Number(categoryCount[0]?.value ?? 0),
    totalCoins: Number(walletSummary[0]?.value ?? 0),
    watchMinutes: 0,
  };
}

export async function createWithdrawalRequest(input: { userId: number; method: "easypaisa" | "jazzcash"; accountName: string; accountNumber: string; coins: number }) {
  if (input.coins < 1000) throw new Error("A minimum of 1,000 coins is required to request a withdrawal.");
  const db = await requireDb();
  const member = (await db.select().from(users).where(eq(users.id, input.userId)).limit(1))[0];
  if (!member || member.coinBalance < input.coins) throw new Error("Insufficient wallet balance.");
  const pkrAmount = Math.floor(input.coins / 1000) * 5;
  const result = await db.insert(withdrawalRequests).values({ ...input, pkrAmount });
  return { id: result[0].insertId, pkrAmount };
}

export async function listWithdrawalRequests() {
  const db = await requireDb();
  return db.select().from(withdrawalRequests).orderBy(desc(withdrawalRequests.createdAt));
}

export async function reviewWithdrawalRequest(input: { requestId: number; adminId: number; decision: "approved" | "rejected"; reviewerNote?: string | null }) {
  const db = await requireDb();
  const request = (await db.select().from(withdrawalRequests).where(eq(withdrawalRequests.id, input.requestId)).limit(1))[0];
  if (!request) throw new Error("Withdrawal request not found.");
  if (request.status !== "pending") throw new Error("This withdrawal request has already been reviewed.");
  await db.transaction(async tx => {
    await tx.update(withdrawalRequests).set({ status: input.decision, reviewedByUserId: input.adminId, reviewedAt: new Date(), reviewerNote: input.reviewerNote ?? null }).where(eq(withdrawalRequests.id, request.id));
    if (input.decision === "approved") {
      await tx.update(users).set({ coinBalance: sql`${users.coinBalance} - ${request.coins}` }).where(eq(users.id, request.userId));
      await tx.insert(walletTransactions).values({ userId: request.userId, activity: "withdrawal_approved", coinsDelta: -request.coins, note: `${request.method} withdrawal approved: PKR ${request.pkrAmount}` });
    }
  });
  return { success: true };
}
