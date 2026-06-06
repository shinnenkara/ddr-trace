import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Example table for your app
export const songs = sqliteTable('songs', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    type: text('type', { enum: ['single', 'double'] }).notNull(),
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
    max_combo_steps_shock_arrows: integer("max_combo_steps_shock_arrows").notNull(), // Max Combo (Steps+Shock Arrows)
    // TODO: add more based on .csv in v2
});

// Export inferred types for your Next.js frontend/backend
export type Song = typeof songs.$inferSelect;
export type InsertSong = typeof songs.$inferInsert;
