import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { userPlayedSongs } from "@/lib/db/schema";
import type { EditPlayInput } from "./edit-play-schema";
import type { UserPlayedSong } from "@/lib/db/schema";

export async function editPlay(
  userId: string,
  input: Omit<EditPlayInput, "user_id">,
): Promise<UserPlayedSong> {
  const db = await getDb();

  const rows = await db
    .update(userPlayedSongs)
    .set({
      arcadeScore: input.arcade_score,
      stage: input.stage ?? null,
      speedModifier: input.speed_modifier ?? null,
      exScore: input.ex_score ?? null,
      playedAt: input.played_at,
    })
    .where(
      and(
        eq(userPlayedSongs.id, input.play_id),
        eq(userPlayedSongs.userId, userId),
      ),
    )
    .returning();

  const updated = rows[0];
  if (!updated) {
    throw new Error("Play not found");
  }

  return updated;
}
