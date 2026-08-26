import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  categories,
  downloads,
  InsertUser,
  movies,
  users,
  walletTransactions,
  watchSessions,
} from "../drizzle/schema";

export const ADMIN_EMAIL = "muhammaddanyal4545@gmail.com";
export const ADMIN_MOBILE = "03311332670";

let database: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!database && process.env.DATABASE_URL) {
    database = drizzle(process.env.DATABASE_URL);
  }
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

export async function createPendingEmailUser(input: { openId: string; email: string; name: string; mobile: string }) {
  const db = await requireDb();
  const role = isAdminEmail(input.email) ? "admin" : "user";
  await db.insert(users).values({
    openId: input.openId,
    email: input.email,
    name: input.name,
    mobile: input.mobile,
    loginMethod: "supabase-email",
    role,
  });
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required.");
  const db = await requireDb();
  const enforcedRole = isAdminEmail(user.email) ? "admin" : "user";
  await db.insert(users).values(user).onDuplicateKeyUpdate({
    set: {
      name: user.name ?? null,
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? null,
      role: enforcedRole,
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

export async function ensureProMovieUser(input: {
  openId: string;
  email?: string | null;
  name?: string | null;
  mobile?: string | null;
  avatarUrl?: string | null;
}) {
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

export async function listPublishedCatalog() {
  const db = await requireDb();
  const allCategories = await db.select().from(categories).orderBy(categories.name);
  const publishedMovies = await db.select().from(movies).where(eq(movies.isPublished, true)).orderBy(desc(movies.createdAt));
  return { categories: allCategories, movies: publishedMovies };
}

export async function listCategories() {
  const db = await requireDb();
  return db.select().from(categories).orderBy(categories.name);
}

export async function createCategory(name: string, slug: string) {
  const db = await requireDb();
  await db.insert(categories).values({ name, slug });
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

export async function listProfileData(userId: number) {
  const db = await requireDb();
  const [transactions, watches, userDownloads] = await Promise.all([
    db.select().from(walletTransactions).where(eq(walletTransactions.userId, userId)).orderBy(desc(walletTransactions.createdAt)).limit(50),
    db.select().from(watchSessions).where(eq(watchSessions.userId, userId)).orderBy(desc(watchSessions.lastPlayedAt)).limit(50),
    db.select().from(downloads).where(eq(downloads.userId, userId)).orderBy(desc(downloads.createdAt)),
  ]);
  return { transactions, watches, downloads: userDownloads };
}

export async function grantWatchReward(input: { userId: number; movieId: number; watchedSeconds: number }) {
  const db = await requireDb();
  const wholeMinutes = Math.floor(input.watchedSeconds / 60);
  if (wholeMinutes <= 0) return { earned: 0 };
  const earned = wholeMinutes * 50;
  await db.transaction(async tx => {
    await tx.insert(walletTransactions).values({
      userId: input.userId,
      movieId: input.movieId,
      activity: "watched",
      coinsDelta: earned,
      note: `${wholeMinutes} verified active playback minute${wholeMinutes === 1 ? "" : "s"}`,
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
