import type {
  DerivedStageContext,
  DdrResolvedPlays,
  PlayerColumnStats,
  StageVision,
  VisionScreenContext,
} from "./ai-results-schema";
type TraceContext = {
  playerSide: string;
  chartType: string;
  screen?: VisionScreenContext;
  stages: StageVision[];
  derivedContexts: DerivedStageContext[];
  resolved: DdrResolvedPlays;
  candidatesByStage: Array<{ before: number; after: number }>;
  overallConfidence: number;
  outcome: "preview";
};

function logPlayerStats(stats: PlayerColumnStats | null | undefined) {
  if (!stats) {
    return null;
  }

  return {
    score: stats.score,
    difficulty_border: stats.difficulty_border.map((border) => ({
      color: border.color,
      confidence: border.confidence,
      short_reason: border.short_reason,
    })),
    grade: stats.grade ?? null,
  };
}

export function logPhotoMatchTrace(context: TraceContext): void {
  console.info(
    "[photo-match] trace",
    JSON.stringify({
      playerSide: context.playerSide,
      chartType: context.chartType,
      mode: context.outcome,
      overallConfidence: context.overallConfidence,
      played_player: context.screen?.played_player ?? null,
      played_player_confidence:
        context.screen?.played_player_confidence ?? null,
      played_player_reason: context.screen?.played_player_reason ?? null,
      stages: context.stages.map((stage, index) => {
        const derived = context.derivedContexts[index];
        return {
          stage: stage.stage,
          title: stage.title_candidates[0]?.title ?? null,
          p1: logPlayerStats(stage.p1),
          p2: logPlayerStats(stage.p2),
          derived: derived
            ? {
                selected_player: derived.selected_player,
                score: derived.score,
                difficulty_color: derived.difficulty_color,
                difficulty_border_confidence:
                  derived.difficulty_border_confidence,
                difficulty_border_reason: derived.difficulty_border_reason,
                score_layout: derived.score_layout,
                score_side_confidence: derived.score_side_confidence,
                difficulty_overridden_by_session_majority:
                  derived.difficulty_overridden_by_session_majority ?? false,
              }
            : null,
          candidateCountBefore: context.candidatesByStage[index]?.before ?? 0,
          candidateCountAfter: context.candidatesByStage[index]?.after ?? 0,
        };
      }),
      plays: context.resolved.plays.map((play) => ({
        stage: play.stage,
        song_id: play.song_id,
        arcade_score: play.arcade_score,
        resolve_confidence: play.resolve_confidence,
        match_reason: play.match_reason,
      })),
    }),
  );
}
