import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { userPlayedSongs } from "@/lib/db/schema";

export async function deletePlay(
  userId: string,
  playId: number,
): Promise<void> {
  const db = await getDb();

  const rows = await db
    .delete(userPlayedSongs)
    .where(
      and(eq(userPlayedSongs.id, playId), eq(userPlayedSongs.userId, userId)),
    )
    .returning({ id: userPlayedSongs.id });

  if (rows.length === 0) {
    throw new Error("Play not found");
  }
}
