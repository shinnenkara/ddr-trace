import { and, count, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { songs, userPlayedSongs } from "@/lib/db/schema";
import type {
  GetUserPlaysOptions,
  GetUserPlaysResult,
  PlayWithSong,
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
        song: songs,
      })
      .from(userPlayedSongs)
      .innerJoin(songs, eq(userPlayedSongs.songId, songs.id))
      .where(where)
      .orderBy(desc(userPlayedSongs.playedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(userPlayedSongs)
      .where(where),
  ]);

  const plays: PlayWithSong[] = rows.map(({ play, song }) => ({
    ...play,
    song,
  }));

  return {
    plays,
    total: countRow[0]?.total ?? 0,
  };
}
