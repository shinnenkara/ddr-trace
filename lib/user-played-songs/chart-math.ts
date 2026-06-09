import type { SongVariant } from "@/lib/db/schema";

/** Total scoring objects: steps + jumps + holds + shock arrows. */
export function getChartObjectCount(variant: Pick<SongVariant, "steps" | "jumps" | "holds" | "shock_arrows">): number {
  return variant.steps + variant.jumps + variant.holds + variant.shock_arrows;
}

/** Maximum arcade Money Score for any chart. */
export const MAX_ARCADE_SCORE = 1_000_000;

/** Maximum EX score for a chart with N objects. */
export function getMaxExScore(variant: Pick<SongVariant, "steps" | "jumps" | "holds" | "shock_arrows">): number {
  return getChartObjectCount(variant) * 3;
}
