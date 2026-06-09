"use server";

import { z } from "zod";
import { getSessionUser } from "@/lib/api/get-session-user";
import { CHART_TYPES } from "@/lib/ddr-match/ai-results-schema";
import { DIFFICULTY_COLORS } from "@/lib/ddr-match/difficulty-colors";
import {
  buildDifficultyOptions,
  variantsForSong,
} from "@/lib/ddr-match/pick-default-difficulty";
import type { ResolveCandidate } from "@/lib/ddr-match/ai-results-schema";
import { getVariantsForSong } from "@/lib/user-played-songs/search-songs-for-match";
import type { PreviewDifficultyOption } from "@/lib/ddr-match/photo-match-outcome";

const schema = z.object({
  songDbId: z.number().int().positive(),
  chartType: z.enum(CHART_TYPES),
  difficultyColor: z.enum(DIFFICULTY_COLORS).nullable().optional(),
});

export async function getDifficultiesForSongAction(
  input: z.infer<typeof schema>,
): Promise<PreviewDifficultyOption[]> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const parsed = schema.parse(input);
  const variants = await getVariantsForSong(parsed.songDbId, parsed.chartType);

  const candidates: ResolveCandidate[] = variants.map((variant) => ({
    song_id: variant.id,
    song_db_id: variant.songId,
    title: variant.song.title,
    artist: variant.song.artist,
    difficulty: variant.difficulty,
    rating: variant.rating,
  }));

  const derived =
    parsed.difficultyColor != null
      ? {
          stage: 1,
          selected_player: "p1" as const,
          score: null,
          difficulty_color: parsed.difficultyColor,
          difficulty_border_confidence: 1,
          difficulty_border_reason: "",
          score_layout: "single" as const,
          score_side_confidence: 1,
        }
      : undefined;

  return buildDifficultyOptions(
    variantsForSong(candidates, parsed.songDbId),
    derived,
  );
}
