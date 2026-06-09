import type {
  DerivedStageContext,
  DdrResolvedPlay,
  ResolveCandidate,
  StageVision,
} from "./ai-results-schema";
import { pickDefaultVariant } from "./pick-default-difficulty";
import { dedupeCandidatesToSongs } from "./search-term-utils";
import { HIGH_TITLE_CONFIDENCE } from "./vision-errors";

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
    const uniqueSongs = dedupeCandidatesToSongs(candidates);

    const canResolveDeterministically =
      topTitle &&
      topTitle.confidence >= HIGH_TITLE_CONFIDENCE &&
      stage.title_candidates.length === 1 &&
      derived.score !== null &&
      uniqueSongs.length === 1;

    if (canResolveDeterministically) {
      const songVariants = candidates.filter(
        (candidate) => candidate.song_db_id === uniqueSongs[0].song_db_id,
      );
      const defaultVariant = pickDefaultVariant(songVariants, derived);

      if (defaultVariant) {
        resolved.push({
          song_id: defaultVariant.song_id,
          stage: stage.stage,
          arcade_score: derived.score as number,
          match_reason:
            "Deterministic match: high-confidence title and single song candidate",
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
