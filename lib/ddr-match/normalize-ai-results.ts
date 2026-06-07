import { z } from "zod";
import { DIFFICULTY_COLORS, type DifficultyColor } from "./difficulty-colors";
import {
  type DdrParsedEntry,
  type DdrScreenParseResult,
  type DdrResolvedPlays,
} from "./ai-results-schema";
import { MAX_ARCADE_SCORE } from "@/lib/user-played-songs/chart-math";

/** Flat schema — Gemini-friendly (no oneOf / boolean enums). */
export const ddrScreenParseGeminiSchema = z.object({
  status: z.preprocess(
    (value) => (typeof value === "string" ? value.toLowerCase().trim() : value),
    z.enum(["success", "error"]),
  ),
  entries: z
    .array(
      z.object({
        stage: z.coerce.number().optional(),
        title: z.string(),
        difficulty_color: z.string(),
        arcade_score: z.coerce.number(),
      }),
    )
    .optional(),
  error: z.string().optional(),
  error_kind: z.preprocess(
    (value) => (typeof value === "string" ? value.toLowerCase().trim() : value),
    z.enum(["content", "transient"]).optional(),
  ),
});

export type DdrScreenParseGemini = z.infer<typeof ddrScreenParseGeminiSchema>;

export const ddrResolvedPlaysGeminiSchema = z.object({
  plays: z.array(
    z.object({
      song_id: z.coerce.number(),
      stage: z.coerce.number().optional(),
      arcade_score: z.coerce.number(),
      match_reason: z.string(),
    }),
  ),
});

function normalizeDifficultyColor(raw: string): DifficultyColor {
  const key = raw.toLowerCase().trim();

  if ((DIFFICULTY_COLORS as readonly string[]).includes(key)) {
    return key as DifficultyColor;
  }

  for (const color of DIFFICULTY_COLORS) {
    if (key.includes(color)) {
      return color;
    }
  }

  throw new Error(`Unrecognized difficulty color: ${raw}`);
}

function normalizeStage(value: number | undefined): number | null {
  if (value === undefined || Number.isNaN(value)) {
    return null;
  }

  const stage = Math.round(value);
  if (stage < 1 || stage > 3) {
    return null;
  }

  return stage;
}

function normalizeArcadeScore(value: number): number {
  const score = Math.round(value);
  if (score < 0 || score > MAX_ARCADE_SCORE) {
    throw new Error(`Arcade score out of range: ${score}`);
  }

  return score;
}

type RawParsedEntry = {
  stage?: number;
  title: string;
  difficulty_color: string;
  arcade_score: number;
};

function normalizeEntry(raw: RawParsedEntry): DdrParsedEntry {
  return {
    stage: normalizeStage(raw.stage),
    title: raw.title.trim(),
    difficulty_color: normalizeDifficultyColor(raw.difficulty_color),
    arcade_score: normalizeArcadeScore(raw.arcade_score),
  };
}

export function normalizeDdrScreenParse(
  raw: DdrScreenParseGemini,
): DdrScreenParseResult {
  if (raw.status === "error") {
    const message = raw.error?.trim();
    if (!message) {
      throw new Error("AI returned error status without a message");
    }

    return {
      status: "error",
      error: message,
      error_kind: raw.error_kind === "transient" ? "transient" : "content",
    };
  }

  const entries = raw.entries ?? [];
  if (entries.length === 0 || entries.length > 3) {
    throw new Error("Expected 1–3 song entries on the results screen");
  }

  return {
    status: "success",
    entries: entries.map(normalizeEntry),
  };
}

export function normalizeDdrResolvedPlays(
  raw: z.infer<typeof ddrResolvedPlaysGeminiSchema>,
): DdrResolvedPlays {
  if (raw.plays.length === 0 || raw.plays.length > 3) {
    throw new Error("Expected 1–3 resolved plays");
  }

  return {
    plays: raw.plays.map((play) => ({
      song_id: Math.round(play.song_id),
      stage: normalizeStage(play.stage),
      arcade_score: normalizeArcadeScore(play.arcade_score),
      match_reason: play.match_reason.trim(),
    })),
  };
}
