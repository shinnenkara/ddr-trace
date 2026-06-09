import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { songs, songVariants, userPlayedSongs } from "@/lib/db/schema";
import type { PlayWithVariant } from "./play-with-song";

export async function getPlayById(
  playId: number,
  userId: string,
): Promise<PlayWithVariant | null> {
  const db = await getDb();

  const rows = await db
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
    variant: { ...row.variant, song: row.song },
  };
}
