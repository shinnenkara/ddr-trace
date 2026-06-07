import type { DdrCapture } from "./ai-results-schema";
import {
  parseResultsScreen,
  resolvePlaysFromCandidates,
} from "./get-ai-ddr-results";
import { searchSongsForMatch } from "@/lib/user-played-songs/search-songs-for-match";
import { getSongsByIds } from "@/lib/user-played-songs/search-songs-for-match";
import { insertPlayedSongs } from "@/lib/user-played-songs/insert-played-songs";
import type { LogPlayResult } from "@/lib/user-played-songs/user-played-song";

export async function matchAndLogPlay(
  capture: DdrCapture,
): Promise<LogPlayResult> {
  const parsed = await parseResultsScreen(capture);

  if (parsed.status === "error") {
    const err = new Error(parsed.error) as Error & {
      errorKind?: "content" | "transient";
    };
    err.errorKind = parsed.error_kind;
    throw err;
  }

  const candidatesByIndex = await Promise.all(
    parsed.entries.map((entry) =>
      searchSongsForMatch(entry.title, entry.difficulty_color),
    ),
  );

  const resolved = await resolvePlaysFromCandidates(
    parsed.entries,
    candidatesByIndex,
    capture.hint,
  );

  const songIds = resolved.plays.map((p) => p.song_id);
  const songs = await getSongsByIds(songIds);
  const songIdSet = new Set(songs.map((s) => s.id));

  for (const play of resolved.plays) {
    if (!songIdSet.has(play.song_id)) {
      throw new Error(`Matched song id ${play.song_id} was not found in database`);
    }
  }

  const batchId = crypto.randomUUID();

  const plays = await insertPlayedSongs(
    resolved.plays.map((play) => ({
      userId: capture.user_id,
      songId: play.song_id,
      arcadeScore: play.arcade_score,
      stage: play.stage ?? null,
      batchId,
      playedAt: capture.played_at,
      source: "photo" as const,
    })),
  );

  return { plays, batchId };
}
