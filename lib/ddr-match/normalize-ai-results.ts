import { z } from "zod";
import { DIFFICULTY_COLORS, type DifficultyColor } from "./difficulty-colors";
import {
  type DdrVisionParseResult,
  type DdrResolvedPlays,
  type PlayerSide,
  type ScoreLayout,
  type ScoreSide,
  type StageVision,
  type TitleCandidate,
} from "./ai-results-schema";
import { MAX_ARCADE_SCORE } from "@/lib/user-played-songs/chart-math";
import {
  MAX_DIFFICULTY_COLOR_ALTERNATES,
  MAX_TITLE_CANDIDATES_PER_STAGE,
  VISION_ERROR_NOT_RESULTS,
  VISION_ERROR_TOO_BLURRY,
} from "./vision-errors";

function preprocessLowerString(value: unknown): unknown {
  return typeof value === "string" ? value.toLowerCase().trim() : value;
}

function preprocessBoolean(value: unknown): unknown {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.toLowerCase().trim();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }
  return value;
}

/** Flat schema — Gemini-friendly (no oneOf / boolean enums). */
export const ddrVisionParseGeminiSchema = z.object({
  status: z.preprocess(preprocessLowerString, z.enum(["success", "error"])),
  looks_like_ddr_results: z.preprocess(
    preprocessBoolean,
    z.boolean().optional(),
  ),
  screen_confidence: z.coerce.number().optional(),
  readability: z.preprocess(preprocessLowerString, z.string().optional()),
  stages: z
    .array(
      z.object({
        title_candidates: z
          .array(
            z.object({
              title: z.string(),
              confidence: z.coerce.number(),
              short_reason: z.string(),
            }),
          )
          .optional(),
        arcade_score: z.coerce.number().nullable().optional(),
        score_confidence: z.coerce.number().optional(),
        score_layout: z.preprocess(
          preprocessLowerString,
          z.string().optional(),
        ),
        left_score: z.coerce.number().nullable().optional(),
        right_score: z.coerce.number().nullable().optional(),
        score_side: z.preprocess(preprocessLowerString, z.string().optional()),
        score_side_confidence: z.coerce.number().optional(),
        score_selection_reason: z.string().optional(),
        difficulty_color: z.string().optional(),
        difficulty_color_alternates: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  error: z.string().optional(),
  error_kind: z.preprocess(
    preprocessLowerString,
    z.enum(["content", "transient"]).optional(),
  ),
});

export type DdrVisionParseGemini = z.infer<typeof ddrVisionParseGeminiSchema>;

export const ddrResolvedPlaysGeminiSchema = z.object({
  plays: z.array(
    z.object({
      song_id: z.coerce.number(),
      arcade_score: z.coerce.number(),
      match_reason: z.string(),
      resolve_confidence: z.coerce.number(),
    }),
  ),
});

function clampConfidence(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function normalizeDifficultyColor(
  raw: string | undefined,
): DifficultyColor | null {
  if (!raw?.trim()) {
    return null;
  }

  const key = raw.toLowerCase().trim();

  if ((DIFFICULTY_COLORS as readonly string[]).includes(key)) {
    return key as DifficultyColor;
  }

  for (const color of DIFFICULTY_COLORS) {
    if (key.includes(color)) {
      return color;
    }
  }

  return null;
}

function stageFromRowIndex(index: number): 1 | 2 | 3 {
  return Math.min(index + 1, 3) as 1 | 2 | 3;
}

function normalizeArcadeScore(value: number | null | undefined): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }

  const score = Math.round(value);
  if (score < 0 || score > MAX_ARCADE_SCORE) {
    return null;
  }

  return score;
}

function normalizeTitleCandidates(
  raw: Array<{ title: string; confidence: number; short_reason: string }>,
): TitleCandidate[] {
  const seen = new Set<string>();

  return raw
    .map((candidate) => ({
      title: candidate.title.trim(),
      confidence: clampConfidence(candidate.confidence),
      short_reason: candidate.short_reason.trim(),
    }))
    .filter((candidate) => candidate.title.length > 0)
    .filter((candidate) => {
      const key = candidate.title.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, MAX_TITLE_CANDIDATES_PER_STAGE);
}

function normalizeScoreSide(raw: string | undefined): ScoreSide | null {
  if (raw === "left" || raw === "right") {
    return raw;
  }
  return null;
}

function inferScoreLayout(
  raw: NonNullable<DdrVisionParseGemini["stages"]>[number],
): ScoreLayout {
  if (raw.score_layout === "dual") {
    return "dual";
  }

  const left = normalizeArcadeScore(raw.left_score);
  const right = normalizeArcadeScore(raw.right_score);

  if (left !== null && right !== null) {
    return "dual";
  }

  return "single";
}

function applyPlayerSideOverride(
  stage: StageVision,
  playerSide: Exclude<PlayerSide, "auto">,
): StageVision {
  const selectedScore =
    playerSide === "left" ? stage.left_score : stage.right_score;

  return {
    ...stage,
    arcade_score: selectedScore,
    score_side: playerSide,
    score_side_confidence: selectedScore !== null ? 1 : 0,
    score_selection_reason: `User specified ${playerSide === "left" ? "1P (left)" : "2P (right)"}`,
    score_confidence: selectedScore !== null ? stage.score_confidence : 0,
  };
}

function normalizeStageVision(
  raw: NonNullable<DdrVisionParseGemini["stages"]>[number],
  index: number,
  playerSide: PlayerSide,
): StageVision {
  const alternates = (raw.difficulty_color_alternates ?? [])
    .map((color) => normalizeDifficultyColor(color))
    .filter((color): color is DifficultyColor => color !== null)
    .slice(0, MAX_DIFFICULTY_COLOR_ALTERNATES);

  const scoreLayout = inferScoreLayout(raw);
  const leftScore = normalizeArcadeScore(raw.left_score);
  const rightScore = normalizeArcadeScore(raw.right_score);
  let arcadeScore = normalizeArcadeScore(raw.arcade_score);
  let scoreSide = normalizeScoreSide(raw.score_side);
  let scoreSideConfidence = clampConfidence(raw.score_side_confidence ?? 0);
  let scoreSelectionReason = raw.score_selection_reason?.trim() ?? "";

  if (scoreLayout === "single") {
    if (arcadeScore === null) {
      arcadeScore = leftScore ?? rightScore;
    }
    scoreSide = null;
    scoreSideConfidence = arcadeScore !== null ? 1 : 0;
    if (!scoreSelectionReason) {
      scoreSelectionReason =
        arcadeScore !== null ? "Single score column on results row" : "";
    }
  } else if (playerSide === "left" || playerSide === "right") {
    arcadeScore = playerSide === "left" ? leftScore : rightScore;
    scoreSide = playerSide;
    scoreSideConfidence = arcadeScore !== null ? 1 : 0;
    scoreSelectionReason = `User specified ${playerSide === "left" ? "1P (left)" : "2P (right)"}`;
  } else {
    if (arcadeScore === null && scoreSide !== null) {
      arcadeScore = scoreSide === "left" ? leftScore : rightScore;
    }
    if (!scoreSelectionReason) {
      scoreSelectionReason =
        scoreSide !== null
          ? `Auto-selected ${scoreSide} column from photo perspective`
          : "";
    }
  }

  const stage: StageVision = {
    stage: stageFromRowIndex(index),
    title_candidates: normalizeTitleCandidates(raw.title_candidates ?? []),
    score_layout: scoreLayout,
    left_score: leftScore,
    right_score: rightScore,
    arcade_score: arcadeScore,
    score_confidence: clampConfidence(raw.score_confidence ?? 0),
    score_side: scoreSide,
    score_side_confidence: scoreSideConfidence,
    score_selection_reason: scoreSelectionReason,
    difficulty_color: normalizeDifficultyColor(raw.difficulty_color),
    difficulty_color_alternates: alternates.length > 0 ? alternates : undefined,
  };

  if (playerSide === "left" || playerSide === "right") {
    return applyPlayerSideOverride(stage, playerSide);
  }

  if (stage.arcade_score === null) {
    stage.arcade_score = stage.left_score ?? stage.right_score;
  }

  return stage;
}

function hasRawRowSignals(
  rawStages: NonNullable<DdrVisionParseGemini["stages"]>,
): boolean {
  return rawStages.some((stage) => {
    const hasTitle = (stage.title_candidates ?? []).some(
      (candidate) => candidate.title.trim().length >= 1,
    );
    const hasScore =
      stage.arcade_score != null ||
      stage.left_score != null ||
      stage.right_score != null;
    const hasColor = Boolean(stage.difficulty_color?.trim());
    return hasTitle || hasScore || hasColor;
  });
}

function canSalvageVisionParse(raw: DdrVisionParseGemini): boolean {
  const rawStages = raw.stages ?? [];
  return (
    rawStages.length > 0 &&
    rawStages.length <= 3 &&
    hasRawRowSignals(rawStages)
  );
}

export function stageHasUsableScore(stage: StageVision): boolean {
  return (
    stage.arcade_score !== null ||
    stage.left_score !== null ||
    stage.right_score !== null
  );
}

export function stageHasExtractableSignal(stage: StageVision): boolean {
  return (
    stageHasUsableScore(stage) ||
    stage.title_candidates.some((candidate) => candidate.title.trim().length >= 1) ||
    stage.difficulty_color !== null
  );
}

export function normalizeDdrVisionParse(
  raw: DdrVisionParseGemini,
  playerSide: PlayerSide = "auto",
): DdrVisionParseResult {
  const salvagedFromError =
    raw.status === "error" && canSalvageVisionParse(raw);

  if (raw.status === "error" && !salvagedFromError) {
    const message = raw.error?.trim();
    if (!message) {
      throw new Error("AI returned error status without a message");
    }

    return {
      status: "error",
      error: message,
      error_kind: raw.error_kind === "transient" ? "transient" : "content",
      looks_like_ddr_results: raw.looks_like_ddr_results,
      readability: raw.readability === "unreadable" ? "unreadable" : undefined,
    };
  }

  const rawStages = raw.stages ?? [];
  if (rawStages.length === 0 || rawStages.length > 3) {
    if (canSalvageVisionParse(raw)) {
      // fall through to normalization below
    } else {
      return {
        status: "error",
        error: VISION_ERROR_NOT_RESULTS,
        error_kind: "content",
      };
    }
  }

  const stages = rawStages.map((stage, index) =>
    normalizeStageVision(stage, index, playerSide),
  );

  if (!stages.some(stageHasExtractableSignal)) {
    return {
      status: "error",
      error: VISION_ERROR_TOO_BLURRY,
      error_kind: "transient",
    };
  }

  const readability =
    raw.readability === "clear" || raw.readability === "partial"
      ? raw.readability
      : "partial";

  return {
    status: "success",
    looks_like_ddr_results: true,
    screen_confidence: clampConfidence(raw.screen_confidence ?? 0.5),
    readability,
    stages,
  };
}

export function normalizeDdrResolvedPlays(
  raw: z.infer<typeof ddrResolvedPlaysGeminiSchema>,
  expectedStages?: StageVision[],
): DdrResolvedPlays {
  if (raw.plays.length === 0 || raw.plays.length > 3) {
    throw new Error("Expected 1–3 resolved plays");
  }

  if (
    expectedStages &&
    expectedStages.length > 0 &&
    raw.plays.length !== expectedStages.length
  ) {
    throw new Error("Resolved play count does not match expected stages");
  }

  return {
    plays: raw.plays.map((play, index) => {
      const score = normalizeArcadeScore(play.arcade_score);
      if (score === null) {
        throw new Error("Resolved play has invalid arcade score");
      }

      const stage =
        expectedStages?.[index]?.stage ?? stageFromRowIndex(index);

      return {
        song_id: Math.round(play.song_id),
        stage,
        arcade_score: score,
        match_reason: play.match_reason.trim(),
        resolve_confidence: clampConfidence(play.resolve_confidence),
      };
    }),
  };
}

export function filterUsableStages(stages: StageVision[]): StageVision[] {
  return stages.filter(
    (stage) =>
      stageHasExtractableSignal(stage) &&
      (stageHasUsableScore(stage) ||
        stage.title_candidates.some(
          (candidate) => candidate.title.trim().length >= 1,
        )),
  );
}
