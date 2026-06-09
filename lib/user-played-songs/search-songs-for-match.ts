import { or, like, eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { songs, type Song } from "@/lib/db/schema";
import {
  difficultyColorToLabels,
  type DifficultyColor,
} from "@/lib/ddr-match/difficulty-colors";

export async function searchSongsForMatch(
  title: string,
  difficultyColor?: DifficultyColor,
): Promise<Song[]> {
  const db = await getDb();
  const trimmed = title.trim();

  if (!trimmed) {
    return [];
  }

  const titleMatch = or(
    like(songs.title, `%${trimmed}%`),
    like(songs.artist, `%${trimmed}%`),
  );

  const difficultyLabels = difficultyColor
    ? difficultyColorToLabels(difficultyColor)
    : null;

  const where =
    difficultyLabels && difficultyLabels.length > 0
      ? and(
          titleMatch,
          or(...difficultyLabels.map((label) => eq(songs.difficulty, label))),
        )
      : titleMatch;

  return db.select().from(songs).where(where).limit(25);
}

export async function searchSongsByQuery(
  query: string,
  limit = 20,
): Promise<Song[]> {
  const db = await getDb();
  const trimmed = query.trim();

  if (!trimmed) {
    return db.select().from(songs).limit(limit);
  }

  return db
    .select()
    .from(songs)
    .where(
      or(like(songs.title, `%${trimmed}%`), like(songs.artist, `%${trimmed}%`)),
    )
    .limit(limit);
}

export async function getSongsByIds(ids: number[]): Promise<Song[]> {
  if (ids.length === 0) {
    return [];
  }

  const db = await getDb();
  const uniqueIds = [...new Set(ids)];
  const results: Song[] = [];

  for (const id of uniqueIds) {
    const [row] = await db
      .select()
      .from(songs)
      .where(eq(songs.id, id))
      .limit(1);
    if (row) {
      results.push(row);
    }
  }

  return results;
}

export type DifficultyVariant = {
  songId: number;
  difficulty: string;
  rating: number;
};

/**
 * For each input song, find all chart difficulties of the same chart
 * (matched by title + artist + type) so the user can switch difficulty
 * during review. Keyed by the input song id.
 */
export async function getDifficultyVariantsForSongs(
  inputSongs: Song[],
): Promise<Map<number, DifficultyVariant[]>> {
  const variantsBySongId = new Map<number, DifficultyVariant[]>();

  if (inputSongs.length === 0) {
    return variantsBySongId;
  }

  const db = await getDb();

  for (const song of inputSongs) {
    const rows = await db
      .select()
      .from(songs)
      .where(
        and(
          eq(songs.title, song.title),
          eq(songs.artist, song.artist),
          eq(songs.type, song.type),
        ),
      );

    variantsBySongId.set(
      song.id,
      rows
        .map((row) => ({
          songId: row.id,
          difficulty: row.difficulty,
          rating: row.rating,
        }))
        .sort((a, b) => a.rating - b.rating),
    );
  }

  return variantsBySongId;
}
