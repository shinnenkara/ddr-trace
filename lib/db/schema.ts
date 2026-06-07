import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Example table for your app
export const songs = sqliteTable("songs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type", { enum: ["single", "double"] }).notNull(),
  folder: text("folder").notNull(), // Folder
  title: text("title").notNull(), // Title
  difficulty: text("difficulty").notNull(), // Difficulty
  rating: integer("rating").notNull(), // Rating
  song_length: integer("song_length").notNull(), // Song Length
  display_bpm_min: integer("display_bpm_min").notNull(), // Display BPM (min)
  display_bpm_max: integer("display_bpm_max").notNull(), // Display BPM (max)
  bpm_changes: integer("bpm_changes").notNull(), // BPM Changes
  artist: text("artist").notNull(), // Artist
  notes: integer("notes").notNull(), // Notes
  steps: integer("steps").notNull(), // Steps
  jumps: integer("jumps").notNull(), // Jumps
  holds: integer("holds").notNull(), // Holds
  shock_arrows: integer("shock_arrows").notNull(), // Shock Arrows
  max_combo_steps_shock_arrows: integer(
    "max_combo_steps_shock_arrows",
  ).notNull(), // Max Combo (Steps+Shock Arrows)
  // TODO: add more based on .csv in v2
});

// Export inferred types for your Next.js frontend/backend
export type Song = typeof songs.$inferSelect;
export type InsertSong = typeof songs.$inferInsert;

// ---------------------------------------------------------------------------
// better-auth tables
//
// Column keys (camelCase) must match better-auth's field names so the Drizzle
// adapter can resolve them. The SQL column names use snake_case. Keep these in
// sync with `getAuthTables` from `@better-auth/core/db`.
// ---------------------------------------------------------------------------

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const userPlayedSongs = sqliteTable("user_played_songs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  songId: integer("song_id")
    .notNull()
    .references(() => songs.id, { onDelete: "cascade" }),
  arcadeScore: integer("arcade_score").notNull(),
  stage: integer("stage"),
  batchId: text("batch_id"),
  exScore: integer("ex_score"),
  speedModifier: text("speed_modifier"),
  playedAt: integer("played_at", { mode: "timestamp" }).notNull(),
  source: text("source", { enum: ["manual", "photo"] }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type UserPlayedSong = typeof userPlayedSongs.$inferSelect;
export type InsertUserPlayedSong = typeof userPlayedSongs.$inferInsert;
