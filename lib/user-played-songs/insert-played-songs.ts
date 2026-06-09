import { getDb } from "@/lib/db";
import { userPlayedSongs, type UserPlayedSong } from "@/lib/db/schema";

export type InsertPlayedSongRow = {
  userId: string;
  songVariantId: number;
  arcadeScore: number;
  stage?: number | null;
  batchId?: string | null;
  exScore?: number | null;
  speedModifier?: string | null;
  playedAt: Date;
  source: "manual" | "photo";
};

export async function insertPlayedSongs(
  rows: InsertPlayedSongRow[],
): Promise<UserPlayedSong[]> {
  if (rows.length === 0) {
    return [];
  }

  const db = await getDb();
  const values = rows.map((row) => ({
    userId: row.userId,
    songVariantId: row.songVariantId,
    arcadeScore: row.arcadeScore,
    stage: row.stage ?? null,
    batchId: row.batchId ?? null,
    exScore: row.exScore ?? null,
    speedModifier: row.speedModifier ?? null,
    playedAt: row.playedAt,
    source: row.source,
  }));

  return db.insert(userPlayedSongs).values(values).returning();
}
