import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";

export const songs = sqliteTable(
  "songs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    folder: text("folder").notNull(),
    title: text("title").notNull(),
    artist: text("artist").notNull(),
    song_length: integer("song_length").notNull(),
    display_bpm_min: integer("display_bpm_min").notNull(),
    display_bpm_max: integer("display_bpm_max").notNull(),
    bpm_changes: integer("bpm_changes").notNull(),
  },
  (table) => [
    uniqueIndex("songs_title_artist_idx").on(table.title, table.artist),
  ],
);

export const songVariants = sqliteTable(
  "song_variants",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    songId: integer("song_id")
      .notNull()
      .references(() => songs.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["single", "double"] }).notNull(),
    difficulty: text("difficulty").notNull(),
    rating: integer("rating").notNull(),
    notes: integer("notes").notNull(),
    steps: integer("steps").notNull(),
    jumps: integer("jumps").notNull(),
    holds: integer("holds").notNull(),
    shock_arrows: integer("shock_arrows").notNull(),
    max_combo_steps_shock_arrows: integer(
      "max_combo_steps_shock_arrows",
    ).notNull(),
  },
  (table) => [
    uniqueIndex("song_variants_song_type_difficulty_idx").on(
      table.songId,
      table.type,
      table.difficulty,
    ),
    index("song_variants_song_id_idx").on(table.songId),
    index("song_variants_type_idx").on(table.type),
  ],
);

export type Song = typeof songs.$inferSelect;
export type InsertSong = typeof songs.$inferInsert;
export type SongVariant = typeof songVariants.$inferSelect;
export type InsertSongVariant = typeof songVariants.$inferInsert;

/** Variant row joined with its parent song — used by matching and play display. */
export type SongVariantWithSong = SongVariant & { song: Song };

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
  songVariantId: integer("song_variant_id")
    .notNull()
    .references(() => songVariants.id, { onDelete: "cascade" }),
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
