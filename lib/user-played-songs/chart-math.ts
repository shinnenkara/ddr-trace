import type { Song } from "@/lib/db/schema";

/** Total scoring objects: steps + jumps + holds + shock arrows. */
export function getChartObjectCount(song: Song): number {
  return song.steps + song.jumps + song.holds + song.shock_arrows;
}

/** Maximum arcade Money Score for any chart. */
export const MAX_ARCADE_SCORE = 1_000_000;

/** Maximum EX score for a chart with N objects. */
export function getMaxExScore(song: Song): number {
  return getChartObjectCount(song) * 3;
}
