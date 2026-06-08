import { difficultyColorToLabels } from "./difficulty-colors";
import type { DerivedStageContext, ResolveCandidate } from "./ai-results-schema";

export function filterCandidatesByDifficulty(
  derivedContexts: DerivedStageContext[],
  candidatesByStage: ResolveCandidate[][],
): ResolveCandidate[][] {
  return derivedContexts.map((context, index) => {
    const candidates = candidatesByStage[index] ?? [];
    if (!context.difficulty_color || candidates.length === 0) {
      return candidates;
    }

    const labels = difficultyColorToLabels(context.difficulty_color);
    const filtered = candidates.filter((candidate) =>
      labels.includes(candidate.difficulty),
    );

    return filtered.length > 0 ? filtered : candidates;
  });
}
