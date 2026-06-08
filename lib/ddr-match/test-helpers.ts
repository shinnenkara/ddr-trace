import type {
  BorderCandidate,
  DerivedStageContext,
  PlayerColumnStats,
  StageVision,
} from "./ai-results-schema";

export function makeBorderCandidate(
  overrides: Partial<BorderCandidate> & Pick<BorderCandidate, "color">,
): BorderCandidate {
  return {
    confidence: 0.9,
    short_reason: "strip beside grade letter",
    ...overrides,
  };
}

export function makePlayerStats(
  overrides: Partial<PlayerColumnStats> = {},
): PlayerColumnStats {
  return {
    score: null,
    difficulty_border: [],
    ...overrides,
  };
}

export function makeStageVision(
  overrides: Partial<StageVision> & Pick<StageVision, "stage">,
): StageVision {
  return {
    title_candidates: [],
    ...overrides,
  };
}

export function makeDerivedStageContext(
  overrides: Partial<DerivedStageContext> & Pick<DerivedStageContext, "stage">,
): DerivedStageContext {
  return {
    selected_player: "p1",
    score: null,
    difficulty_color: null,
    difficulty_border_confidence: 0,
    difficulty_border_reason: "",
    score_layout: "single",
    score_side_confidence: 1,
    ...overrides,
  };
}
