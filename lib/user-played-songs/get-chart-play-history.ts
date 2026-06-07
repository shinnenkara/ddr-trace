import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { userPlayedSongs } from "@/lib/db/schema";
import type { UserPlayedSong } from "@/lib/db/schema";

export async function getChartPlayHistory(
  userId: string,
  songId: number,
): Promise<UserPlayedSong[]> {
  const db = await getDb();

  return db
    .select()
    .from(userPlayedSongs)
    .where(
      and(
        eq(userPlayedSongs.userId, userId),
        eq(userPlayedSongs.songId, songId),
      ),
    )
    .orderBy(asc(userPlayedSongs.playedAt));
}
