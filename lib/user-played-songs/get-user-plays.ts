import { and, count, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { songs, songVariants, userPlayedSongs } from "@/lib/db/schema";
import type {
  GetUserPlaysOptions,
  GetUserPlaysResult,
  PlayWithVariant,
} from "./play-with-song";

const DEFAULT_LIMIT = 50;

export async function getUserPlays(
  userId: string,
  options: GetUserPlaysOptions = {},
): Promise<GetUserPlaysResult> {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const offset = options.offset ?? 0;
  const db = await getDb();

  const where = eq(userPlayedSongs.userId, userId);

  const [rows, countRow] = await Promise.all([
    db
      .select({
        play: userPlayedSongs,
        variant: songVariants,
        song: songs,
      })
      .from(userPlayedSongs)
      .innerJoin(
        songVariants,
        eq(userPlayedSongs.songVariantId, songVariants.id),
      )
      .innerJoin(songs, eq(songVariants.songId, songs.id))
      .where(where)
      .orderBy(desc(userPlayedSongs.playedAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(userPlayedSongs).where(where),
  ]);

  const plays: PlayWithVariant[] = rows.map(({ play, variant, song }) => ({
    ...play,
    variant: { ...variant, song },
  }));

  return {
    plays,
    total: countRow[0]?.total ?? 0,
  };
}
