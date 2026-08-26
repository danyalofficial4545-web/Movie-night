import {
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  mobile: varchar("mobile", { length: 32 }),
  avatarUrl: text("avatarUrl"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  coinBalance: int("coinBalance").default(0).notNull(),
  isBlocked: boolean("isBlocked").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, table => [
  uniqueIndex("users_mobile_unique").on(table.mobile),
  index("users_email_idx").on(table.email),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 140 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const movies = mysqlTable("movies", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId").notNull().references(() => categories.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 240 }).notNull(),
  description: text("description").notNull(),
  thumbnailUrl: text("thumbnailUrl"),
  bannerUrl: text("bannerUrl"),
  videoUrl: text("videoUrl"),
  languageTags: json("languageTags").$type<string[]>().notNull(),
  quality: mysqlEnum("quality", ["720p", "1080p"]).default("1080p").notNull(),
  releaseYear: int("releaseYear").notNull(),
  downloadCost: int("downloadCost").default(1000).notNull(),
  isPublished: boolean("isPublished").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("movies_category_idx").on(table.categoryId)]);

export const watchSessions = mysqlTable("watchSessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  movieId: int("movieId").notNull().references(() => movies.id, { onDelete: "cascade" }),
  episodeLabel: varchar("episodeLabel", { length: 120 }),
  watchedSeconds: int("watchedSeconds").default(0).notNull(),
  coinsEarned: int("coinsEarned").default(0).notNull(),
  lastPlayedAt: timestamp("lastPlayedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("watch_session_user_movie_episode_unique").on(table.userId, table.movieId, table.episodeLabel),
  index("watch_session_user_idx").on(table.userId),
]);

export const walletTransactions = mysqlTable("walletTransactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  movieId: int("movieId").references(() => movies.id, { onDelete: "set null" }),
  activity: mysqlEnum("activity", ["watched", "downloaded", "admin_adjustment"]).notNull(),
  coinsDelta: int("coinsDelta").notNull(),
  note: varchar("note", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("wallet_transaction_user_idx").on(table.userId),
  index("wallet_transaction_movie_idx").on(table.movieId),
]);

export const downloads = mysqlTable("downloads", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  movieId: int("movieId").notNull().references(() => movies.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("download_user_movie_unique").on(table.userId, table.movieId),
  index("download_user_idx").on(table.userId),
]);
