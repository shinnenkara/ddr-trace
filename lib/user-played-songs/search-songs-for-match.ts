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
