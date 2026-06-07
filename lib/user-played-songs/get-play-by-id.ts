import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { songs, userPlayedSongs } from "@/lib/db/schema";
import type { PlayWithSong } from "./play-with-song";

export async function getPlayById(
  playId: number,
  userId: string,
): Promise<PlayWithSong | null> {
  const db = await getDb();

  const rows = await db
    .select({
      play: userPlayedSongs,
      song: songs,
    })
    .from(userPlayedSongs)
    .innerJoin(songs, eq(userPlayedSongs.songId, songs.id))
    .where(
      and(eq(userPlayedSongs.id, playId), eq(userPlayedSongs.userId, userId)),
    )
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    ...row.play,
    song: row.song,
  };
}
