import { difficultyColorToLabels } from "./difficulty-colors";
import type { DerivedStageContext, ResolveCandidate } from "./ai-results-schema";

export type DifficultyOption = {
  songId: number;
  difficulty: string;
  rating: number;
  suggested?: boolean;
};

export function variantsForSong(
  candidates: ResolveCandidate[],
  songDbId: number,
): ResolveCandidate[] {
  return candidates.filter((candidate) => candidate.song_db_id === songDbId);
}

export function buildDifficultyOptions(
  variants: ResolveCandidate[],
  derived: DerivedStageContext | undefined,
): DifficultyOption[] {
  const labels =
    derived?.difficulty_color != null
      ? difficultyColorToLabels(derived.difficulty_color)
      : [];

  const options = variants
    .map((variant) => {
      const option: DifficultyOption = {
        songId: variant.song_id,
        difficulty: variant.difficulty,
        rating: variant.rating,
      };
      if (labels.includes(variant.difficulty)) {
        option.suggested = true;
      }
      return option;
    })
    .sort((a, b) => a.rating - b.rating);

  if (options.length > 0 && !options.some((option) => option.suggested)) {
    return options;
  }

  return options;
}

export function pickDefaultVariant(
  variants: ResolveCandidate[],
  derived: DerivedStageContext | undefined,
): ResolveCandidate | null {
  if (variants.length === 0) {
    return null;
  }

  const options = buildDifficultyOptions(variants, derived);
  const suggested = options.find((option) => option.suggested);
  if (suggested) {
    return (
      variants.find((variant) => variant.song_id === suggested.songId) ?? null
    );
  }

  return [...variants].sort((a, b) => b.rating - a.rating)[0] ?? null;
}
