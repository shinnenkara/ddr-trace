import {
  difficultyColorToLabels,
  type DifficultyColor,
} from "./difficulty-colors";
import type {
  DerivedStageContext,
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
  ambiguousDerived: DerivedStageContext[];
  ambiguousCandidates: ResolveCandidate[][];
};

export function tryDeterministicResolve(
  stages: StageVision[],
  derivedContexts: DerivedStageContext[],
  candidatesByStage: ResolveCandidate[][],
): DeterministicResolveResult {
  const resolved: DdrResolvedPlay[] = [];
  const ambiguousStages: StageVision[] = [];
  const ambiguousDerived: DerivedStageContext[] = [];
  const ambiguousCandidates: ResolveCandidate[][] = [];

  for (let index = 0; index < stages.length; index++) {
    const stage = stages[index];
    const derived = derivedContexts[index];
    const candidates = candidatesByStage[index] ?? [];

    if (!derived) {
      ambiguousStages.push(stage);
      ambiguousDerived.push({
        stage: stage.stage,
        selected_player: "p1",
        score: null,
        difficulty_color: null,
        difficulty_border_confidence: 0,
        difficulty_border_reason: "",
        score_layout: "single",
        score_side_confidence: 0,
      });
      ambiguousCandidates.push(candidates);
      continue;
    }

    const topTitle = stage.title_candidates[0];

    const canResolveDeterministically =
      topTitle &&
      topTitle.confidence >= HIGH_TITLE_CONFIDENCE &&
      stage.title_candidates.length === 1 &&
      derived.score !== null;

    if (canResolveDeterministically) {
      const matching = candidates.filter((candidate) =>
        matchesDifficultyColor(candidate, derived.difficulty_color),
      );

      if (matching.length === 1) {
        resolved.push({
          song_id: matching[0].song_id,
          stage: stage.stage,
          arcade_score: derived.score as number,
          match_reason:
            "Deterministic match: high-confidence title and single DB row for difficulty",
          resolve_confidence: topTitle.confidence,
        });
        continue;
      }
    }

    ambiguousStages.push(stage);
    ambiguousDerived.push(derived);
    ambiguousCandidates.push(candidates);
  }

  return {
    resolved,
    ambiguousStages,
    ambiguousDerived,
    ambiguousCandidates,
  };
}
