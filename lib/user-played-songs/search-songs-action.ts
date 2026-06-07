"use server";

import { getSessionUser } from "@/lib/api/get-session-user";
import { searchSongsByQuery } from "@/lib/user-played-songs/search-songs-for-match";
import type { Song } from "@/lib/db/schema";
import { searchSongsSchema } from "@/lib/user-played-songs/log-play-schema";

export async function searchSongsAction(
  q: string,
  limit?: number,
): Promise<Song[]> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const parsed = searchSongsSchema.parse({ q, limit });
  return searchSongsByQuery(parsed.q, parsed.limit);
}
