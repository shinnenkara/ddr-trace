import {
  difficultyColorToLabels,
  type DifficultyColor,
} from "./difficulty-colors";
import type {
  DdrResolvedPlay,
  ResolveCandidate,
  StageVision,
} from "./ai-results-schema";
import { HIGH_TITLE_CONFIDENCE } from "./vision-errors";

function matchesDifficultyColor(
  candidate: ResolveCandidate,
  color: DifficultyColor | null,
): boolean {
  if (!color) {
    return true;
  }

  const labels = difficultyColorToLabels(color);
  return labels.includes(candidate.difficulty);
}

export type DeterministicResolveResult = {
  resolved: DdrResolvedPlay[];
  ambiguousStages: StageVision[];
  ambiguousCandidates: ResolveCandidate[][];
};

export function tryDeterministicResolve(
  stages: StageVision[],
  candidatesByStage: ResolveCandidate[][],
): DeterministicResolveResult {
  const resolved: DdrResolvedPlay[] = [];
  const ambiguousStages: StageVision[] = [];
  const ambiguousCandidates: ResolveCandidate[][] = [];

  for (let index = 0; index < stages.length; index++) {
    const stage = stages[index];
    const candidates = candidatesByStage[index] ?? [];
    const topTitle = stage.title_candidates[0];

    const canResolveDeterministically =
      topTitle &&
      topTitle.confidence >= HIGH_TITLE_CONFIDENCE &&
      stage.title_candidates.length === 1 &&
      stage.arcade_score !== null;

    if (canResolveDeterministically) {
      const matching = candidates.filter((candidate) =>
        matchesDifficultyColor(candidate, stage.difficulty_color),
      );

      if (matching.length === 1) {
        resolved.push({
          song_id: matching[0].song_id,
          stage: stage.stage,
          arcade_score: stage.arcade_score as number,
          match_reason:
            "Deterministic match: high-confidence title and single DB row for difficulty",
          resolve_confidence: topTitle.confidence,
        });
        continue;
      }
    }

    ambiguousStages.push(stage);
    ambiguousCandidates.push(candidates);
  }

  return { resolved, ambiguousStages, ambiguousCandidates };
}
