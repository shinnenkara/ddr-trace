import type { StageVision } from "./ai-results-schema";

type MatchFailureContext = {
  userId?: string;
  chartType?: string;
  playerSide?: string;
  visionStages?: StageVision[];
  resolvedPlays?: Array<{ stage?: number | null; song_id?: number }>;
};

export function logPhotoMatchFailure(
  err: unknown,
  context: MatchFailureContext = {},
): void {
  const message = err instanceof Error ? err.message : String(err);
  const errorKind =
    err instanceof Error
      ? (err as Error & { errorKind?: string }).errorKind
      : undefined;

  console.error(
    "[photo-match] failed",
    JSON.stringify({
      message,
      errorKind,
      userId: context.userId,
      chartType: context.chartType,
      playerSide: context.playerSide,
      visionStages: context.visionStages?.map((stage) => ({
        stage: stage.stage,
        titles: stage.title_candidates.map((candidate) => candidate.title),
        p1: stage.p1
          ? {
              score: stage.p1.score,
              difficulty_border: stage.p1.difficulty_border.map((border) => ({
                color: border.color,
                confidence: border.confidence,
                short_reason: border.short_reason,
              })),
            }
          : null,
        p2: stage.p2
          ? {
              score: stage.p2.score,
              difficulty_border: stage.p2.difficulty_border.map((border) => ({
                color: border.color,
                confidence: border.confidence,
                short_reason: border.short_reason,
              })),
            }
          : null,
      })),
      resolvedPlays: context.resolvedPlays,
      stack: err instanceof Error ? err.stack : undefined,
    }),
  );
}
