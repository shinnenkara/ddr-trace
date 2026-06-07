import { z } from "zod";
import { DIFFICULTY_COLORS } from "./difficulty-colors";
import { MAX_ARCADE_SCORE } from "@/lib/user-played-songs/chart-math";

export const CHART_TYPES = ["single", "double"] as const;
export type ChartType = (typeof CHART_TYPES)[number];

export const PLAYER_SIDES = ["auto", "left", "right"] as const;
export type PlayerSide = (typeof PLAYER_SIDES)[number];

export const SCORE_LAYOUTS = ["single", "dual"] as const;
export type ScoreLayout = (typeof SCORE_LAYOUTS)[number];

export const SCORE_SIDES = ["left", "right"] as const;
export type ScoreSide = (typeof SCORE_SIDES)[number];

export const titleCandidateSchema = z.object({
  title: z.string().min(1),
  confidence: z.number().min(0).max(1),
  short_reason: z.string().min(1),
});

export type TitleCandidate = z.infer<typeof titleCandidateSchema>;

export const stageVisionSchema = z.object({
  stage: z.number().int().min(1).max(3),
  title_candidates: z.array(titleCandidateSchema).max(10),
  score_layout: z.enum(SCORE_LAYOUTS),
  left_score: z.number().int().min(0).max(MAX_ARCADE_SCORE).nullable(),
  right_score: z.number().int().min(0).max(MAX_ARCADE_SCORE).nullable(),
  arcade_score: z.number().int().min(0).max(MAX_ARCADE_SCORE).nullable(),
  score_confidence: z.number().min(0).max(1),
  score_side: z.enum(SCORE_SIDES).nullable(),
  score_side_confidence: z.number().min(0).max(1),
  score_selection_reason: z.string(),
  difficulty_color: z.enum(DIFFICULTY_COLORS).nullable(),
  difficulty_color_alternates: z
    .array(z.enum(DIFFICULTY_COLORS))
    .max(2)
    .optional(),
});

export type StageVision = z.infer<typeof stageVisionSchema>;

export const ddrVisionParseSuccessSchema = z.object({
  status: z.literal("success"),
  looks_like_ddr_results: z.literal(true),
  screen_confidence: z.number().min(0).max(1),
  readability: z.enum(["clear", "partial"]),
  stages: z.array(stageVisionSchema).min(1).max(3),
});

export const ddrVisionParseErrorSchema = z.object({
  status: z.literal("error"),
  error: z.string().min(1),
  error_kind: z.enum(["content", "transient"]),
  looks_like_ddr_results: z.boolean().optional(),
  readability: z.enum(["unreadable"]).optional(),
});

export const ddrVisionParseSchema = z.discriminatedUnion("status", [
  ddrVisionParseSuccessSchema,
  ddrVisionParseErrorSchema,
]);

export type DdrVisionParseResult = z.infer<typeof ddrVisionParseSchema>;

export const resolveCandidateSchema = z.object({
  song_id: z.number().int().positive(),
  title: z.string(),
  artist: z.string(),
  difficulty: z.string(),
  rating: z.number().int(),
});

export type ResolveCandidate = z.infer<typeof resolveCandidateSchema>;

export const ddrResolvedPlaySchema = z.object({
  song_id: z.number().int().positive(),
  stage: z.number().int().min(1).max(3).nullable().optional(),
  arcade_score: z.number().int().min(0).max(MAX_ARCADE_SCORE),
  match_reason: z.string().min(1),
  resolve_confidence: z.number().min(0).max(1),
});

export const ddrResolvedPlaysSchema = z.object({
  plays: z.array(ddrResolvedPlaySchema).min(1).max(3),
});

export type DdrResolvedPlay = z.infer<typeof ddrResolvedPlaySchema>;
export type DdrResolvedPlays = z.infer<typeof ddrResolvedPlaysSchema>;

export type DdrCapture = {
  capture_base64: string;
  name: string;
  mime: string;
  hint?: string | null;
  chart_type: ChartType;
  player_side: PlayerSide;
  user_id: string;
  played_at: Date;
};
