import { or, like, eq, and, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  songs,
  songVariants,
  type SongVariantWithSong,
} from "@/lib/db/schema";
import {
  difficultyColorToLabels,
  type DifficultyColor,
} from "@/lib/ddr-match/difficulty-colors";

function mapVariantRow(
  variant: typeof songVariants.$inferSelect,
  song: typeof songs.$inferSelect,
): SongVariantWithSong {
  return { ...variant, song };
}

export async function searchSongsForMatch(
  title: string,
  difficultyColor?: DifficultyColor,
): Promise<SongVariantWithSong[]> {
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
          or(
            ...difficultyLabels.map((label) =>
              eq(songVariants.difficulty, label),
            ),
          ),
        )
      : titleMatch;

  const rows = await db
    .select({ variant: songVariants, song: songs })
    .from(songVariants)
    .innerJoin(songs, eq(songVariants.songId, songs.id))
    .where(where)
    .limit(25);

  return rows.map(({ variant, song }) => mapVariantRow(variant, song));
}

export async function searchSongsByQuery(
  query: string,
  limit = 20,
): Promise<SongVariantWithSong[]> {
  const db = await getDb();
  const trimmed = query.trim();

  const base = db
    .select({ variant: songVariants, song: songs })
    .from(songVariants)
    .innerJoin(songs, eq(songVariants.songId, songs.id));

  const rows = trimmed
    ? await base
        .where(
          or(
            like(songs.title, `%${trimmed}%`),
            like(songs.artist, `%${trimmed}%`),
          ),
        )
        .limit(limit)
    : await base.limit(limit);

  return rows.map(({ variant, song }) => mapVariantRow(variant, song));
}

export async function getVariantsByIds(
  ids: number[],
): Promise<SongVariantWithSong[]> {
  if (ids.length === 0) {
    return [];
  }

  const db = await getDb();
  const uniqueIds = [...new Set(ids)];

  const rows = await db
    .select({ variant: songVariants, song: songs })
    .from(songVariants)
    .innerJoin(songs, eq(songVariants.songId, songs.id))
    .where(inArray(songVariants.id, uniqueIds));

  return rows.map(({ variant, song }) => mapVariantRow(variant, song));
}

export type DifficultyVariant = {
  songId: number;
  difficulty: string;
  rating: number;
  suggested?: boolean;
};

export async function getVariantsForSong(
  songDbId: number,
  chartType: SongVariantWithSong["type"],
): Promise<SongVariantWithSong[]> {
  const db = await getDb();

  const rows = await db
    .select({ variant: songVariants, song: songs })
    .from(songVariants)
    .innerJoin(songs, eq(songVariants.songId, songs.id))
    .where(
      and(eq(songVariants.songId, songDbId), eq(songVariants.type, chartType)),
    );

  return rows.map(({ variant, song }) => mapVariantRow(variant, song));
}

/**
 * For each input variant, find all chart difficulties of the same song
 * (matched by song_id) so the user can switch difficulty during review.
 * Keyed by the input variant id.
 */
export async function getDifficultyVariantsForSongs(
  inputVariants: SongVariantWithSong[],
): Promise<Map<number, DifficultyVariant[]>> {
  const variantsByVariantId = new Map<number, DifficultyVariant[]>();

  if (inputVariants.length === 0) {
    return variantsByVariantId;
  }

  const db = await getDb();
  const songIds = [...new Set(inputVariants.map((v) => v.songId))];

  const rows = await db
    .select()
    .from(songVariants)
    .where(inArray(songVariants.songId, songIds));

  const bySongId = new Map<number, DifficultyVariant[]>();
  for (const row of rows) {
    const list = bySongId.get(row.songId) ?? [];
    list.push({
      songId: row.id,
      difficulty: row.difficulty,
      rating: row.rating,
    });
    bySongId.set(row.songId, list);
  }

  for (const variant of inputVariants) {
    const options = (bySongId.get(variant.songId) ?? []).sort(
      (a, b) => a.rating - b.rating,
    );
    variantsByVariantId.set(variant.id, options);
  }

  return variantsByVariantId;
}
