import { z } from "zod";
import { DIFFICULTY_COLORS, type DifficultyColor } from "./difficulty-colors";
import {
  type BorderCandidate,
  type DdrVisionParseResult,
  type DdrResolvedPlays,
  type PlayerColumnStats,
  type StageVision,
  type TitleCandidate,
  type VisionScreenContext,
} from "./ai-results-schema";
import { MAX_ARCADE_SCORE } from "@/lib/user-played-songs/chart-math";
import {
  MAX_BORDER_CANDIDATES_PER_PLAYER,
  MAX_TITLE_CANDIDATES_PER_STAGE,
  VISION_ERROR_NOT_RESULTS,
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

const borderCandidateGeminiSchema = z.object({
  color: z
    .enum(DIFFICULTY_COLORS)
    .describe(
      "Thin vertical difficulty strip on the grade panel edge (NOT the grade letter fill color): green, blue, yellow, red, or purple.",
    ),
  confidence: z.coerce.number(),
  short_reason: z.string(),
});

const playerColumnStatsGeminiSchema = z.object({
  score: z.coerce.number().nullable().optional(),
  difficulty_border: z.array(borderCandidateGeminiSchema).optional(),
  grade: z.string().nullable().optional(),
});

/** Gemini-friendly schema — nested p1/p2 per stage. */
export const ddrVisionParseGeminiSchema = z.object({
  status: z.preprocess(preprocessLowerString, z.enum(["success", "error"])),
  looks_like_ddr_results: z.preprocess(
    preprocessBoolean,
    z.boolean().optional(),
  ),
  screen_confidence: z.coerce.number().optional(),
  readability: z.preprocess(preprocessLowerString, z.string().optional()),
  played_player: z.preprocess(preprocessLowerString, z.string().optional()),
  played_player_confidence: z.coerce.number().optional(),
  played_player_reason: z.string().optional(),
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
        p1: playerColumnStatsGeminiSchema.nullable().optional(),
        p2: playerColumnStatsGeminiSchema.nullable().optional(),
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

const DIFFICULTY_COLOR_SYNONYMS: Record<string, DifficultyColor> = {
  orange: "yellow",
  gold: "yellow",
  amber: "yellow",
  cyan: "blue",
  "light blue": "blue",
  "sky blue": "blue",
  aqua: "blue",
  lime: "green",
  teal: "green",
  violet: "purple",
  magenta: "purple",
  pink: "purple",
};

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

  const synonym = DIFFICULTY_COLOR_SYNONYMS[key];
  if (synonym) {
    return synonym;
  }

  for (const [alias, color] of Object.entries(DIFFICULTY_COLOR_SYNONYMS)) {
    if (key.includes(alias)) {
      return color;
    }
  }

  for (const color of DIFFICULTY_COLORS) {
    if (key.includes(color)) {
      return color;
    }
  }

  return null;
}

function normalizePlayedPlayer(
  raw: string | undefined,
): VisionScreenContext["played_player"] {
  if (raw === "p1" || raw === "1" || raw === "left") {
    return "p1";
  }
  if (raw === "p2" || raw === "2" || raw === "right") {
    return "p2";
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

function normalizeBorderCandidates(
  raw: Array<{ color: string; confidence: number; short_reason: string }>,
): BorderCandidate[] {
  const seen = new Set<string>();

  return raw
    .map((candidate) => {
      const color = normalizeDifficultyColor(candidate.color);
      if (!color) {
        return null;
      }
      return {
        color,
        confidence: clampConfidence(candidate.confidence),
        short_reason: candidate.short_reason.trim(),
      };
    })
    .filter((candidate): candidate is BorderCandidate => candidate !== null)
    .filter((candidate) => candidate.short_reason.length > 0)
    .filter((candidate) => {
      const key = candidate.color;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, MAX_BORDER_CANDIDATES_PER_PLAYER);
}

function normalizePlayerColumnStats(
  raw: z.infer<typeof playerColumnStatsGeminiSchema> | null | undefined,
): PlayerColumnStats | null {
  if (!raw) {
    return null;
  }

  const score = normalizeArcadeScore(raw.score);
  const difficulty_border = normalizeBorderCandidates(
    raw.difficulty_border ?? [],
  );

  if (score === null && difficulty_border.length === 0 && !raw.grade?.trim()) {
    return null;
  }

  return {
    score,
    difficulty_border,
    grade: raw.grade?.trim() || undefined,
  };
}

function normalizeStageVision(
  raw: NonNullable<DdrVisionParseGemini["stages"]>[number],
  index: number,
): StageVision {
  const p1 = normalizePlayerColumnStats(raw.p1);
  const p2 = normalizePlayerColumnStats(raw.p2);

  const stage: StageVision = {
    stage: stageFromRowIndex(index),
    title_candidates: normalizeTitleCandidates(raw.title_candidates ?? []),
  };

  if (p1) {
    stage.p1 = p1;
  }
  if (p2) {
    stage.p2 = p2;
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
    const p1 = normalizePlayerColumnStats(stage.p1);
    const p2 = normalizePlayerColumnStats(stage.p2);
    const hasScore = p1?.score != null || p2?.score != null;
    const hasBorder =
      (p1?.difficulty_border.length ?? 0) > 0 ||
      (p2?.difficulty_border.length ?? 0) > 0;
    return hasTitle || hasScore || hasBorder;
  });
}

function isBlurOrUnreadableError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("blur") ||
    normalized.includes("unreadable") ||
    normalized.includes("too unclear") ||
    normalized.includes("cannot read") ||
    normalized.includes("can't read")
  );
}

function emptyStageVision(): StageVision {
  return {
    stage: 1,
    title_candidates: [],
  };
}

function canSalvageVisionParse(raw: DdrVisionParseGemini): boolean {
  const rawStages = raw.stages ?? [];
  return (
    rawStages.length > 0 &&
    rawStages.length <= 3 &&
    hasRawRowSignals(rawStages)
  );
}

function parseScreenContext(raw: DdrVisionParseGemini): VisionScreenContext {
  return {
    played_player: normalizePlayedPlayer(raw.played_player),
    played_player_confidence:
      raw.played_player_confidence !== undefined
        ? clampConfidence(raw.played_player_confidence)
        : undefined,
    played_player_reason: raw.played_player_reason?.trim() || undefined,
  };
}

export function stageHasUsableScore(stage: StageVision): boolean {
  return stage.p1?.score != null || stage.p2?.score != null;
}

export function stageHasExtractableSignal(stage: StageVision): boolean {
  return (
    stageHasUsableScore(stage) ||
    stage.title_candidates.some((candidate) => candidate.title.trim().length >= 1) ||
    (stage.p1?.difficulty_border.length ?? 0) > 0 ||
    (stage.p2?.difficulty_border.length ?? 0) > 0
  );
}

export function normalizeDdrVisionParse(
  raw: DdrVisionParseGemini,
): DdrVisionParseResult {
  const salvagedFromError =
    raw.status === "error" && canSalvageVisionParse(raw);

  if (raw.status === "error" && !salvagedFromError) {
    const message = raw.error?.trim();
    if (!message) {
      throw new Error("AI returned error status without a message");
    }

    if (isBlurOrUnreadableError(message)) {
      const screen = parseScreenContext(raw);
      return {
        status: "success",
        looks_like_ddr_results: true,
        screen_confidence: clampConfidence(raw.screen_confidence ?? 0.5),
        readability: "partial",
        played_player: screen.played_player ?? undefined,
        played_player_confidence: screen.played_player_confidence,
        played_player_reason: screen.played_player_reason,
        stages: [emptyStageVision()],
      };
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
    if (!canSalvageVisionParse(raw)) {
      return {
        status: "error",
        error: VISION_ERROR_NOT_RESULTS,
        error_kind: "content",
      };
    }
  }

  const screen = parseScreenContext(raw);

  const stages = rawStages.map((stage, index) =>
    normalizeStageVision(stage, index),
  );

  const readability =
    raw.readability === "clear" || raw.readability === "partial"
      ? raw.readability
      : "partial";

  return {
    status: "success",
    looks_like_ddr_results: true,
    screen_confidence: clampConfidence(raw.screen_confidence ?? 0.5),
    readability,
    played_player: screen.played_player ?? undefined,
    played_player_confidence: screen.played_player_confidence,
    played_player_reason: screen.played_player_reason,
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

      const songId = Math.round(play.song_id);
      if (songId <= 0) {
        throw new Error(`Resolved play has invalid song_id: ${play.song_id}`);
      }

      return {
        song_id: songId,
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
