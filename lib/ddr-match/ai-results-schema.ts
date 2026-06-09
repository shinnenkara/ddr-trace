import { z } from "zod";
import { DIFFICULTY_COLORS } from "./difficulty-colors";
import { MAX_ARCADE_SCORE } from "@/lib/user-played-songs/chart-math";

export const CHART_TYPES = ["single", "double"] as const;
export type ChartType = (typeof CHART_TYPES)[number];

export const PLAYER_SIDES = ["auto", "left", "right"] as const;
export type PlayerSide = (typeof PLAYER_SIDES)[number];

export const SCORE_LAYOUTS = ["single", "dual"] as const;
export type ScoreLayout = (typeof SCORE_LAYOUTS)[number];

export const SELECTED_PLAYERS = ["p1", "p2"] as const;
export type SelectedPlayer = (typeof SELECTED_PLAYERS)[number];

export const titleCandidateSchema = z.object({
  title: z.string().min(1),
  confidence: z.number().min(0).max(1),
  short_reason: z.string().min(1),
});

export type TitleCandidate = z.infer<typeof titleCandidateSchema>;

export const borderCandidateSchema = z.object({
  color: z.enum(DIFFICULTY_COLORS),
  confidence: z.number().min(0).max(1),
  short_reason: z.string().min(1),
});

export type BorderCandidate = z.infer<typeof borderCandidateSchema>;

export const playerColumnStatsSchema = z.object({
  score: z.number().int().min(0).max(MAX_ARCADE_SCORE).nullable(),
  difficulty_border: z.array(borderCandidateSchema).max(3),
  grade: z.string().nullable().optional(),
});

export type PlayerColumnStats = z.infer<typeof playerColumnStatsSchema>;

export const stageVisionSchema = z.object({
  stage: z.number().int().min(1).max(3),
  title_candidates: z.array(titleCandidateSchema).max(10),
  p1: playerColumnStatsSchema.nullable().optional(),
  p2: playerColumnStatsSchema.nullable().optional(),
});

export type StageVision = z.infer<typeof stageVisionSchema>;

export const derivedStageContextSchema = z.object({
  stage: z.number().int().min(1).max(3),
  selected_player: z.enum(SELECTED_PLAYERS),
  score: z.number().int().min(0).max(MAX_ARCADE_SCORE).nullable(),
  difficulty_color: z.enum(DIFFICULTY_COLORS).nullable(),
  difficulty_border_confidence: z.number().min(0).max(1),
  difficulty_border_reason: z.string(),
  score_layout: z.enum(SCORE_LAYOUTS),
  score_side_confidence: z.number().min(0).max(1),
  difficulty_overridden_by_session_majority: z.boolean().optional(),
});

export type DerivedStageContext = z.infer<typeof derivedStageContextSchema>;

export const ddrVisionParseSuccessSchema = z.object({
  status: z.literal("success"),
  looks_like_ddr_results: z.literal(true),
  screen_confidence: z.number().min(0).max(1),
  readability: z.enum(["clear", "partial"]),
  played_player: z.enum(SELECTED_PLAYERS).nullable().optional(),
  played_player_confidence: z.number().min(0).max(1).optional(),
  played_player_reason: z.string().optional(),
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
  /** song_variants.id — the variant row used when logging a play */
  song_id: z.number().int().positive(),
  /** songs.id — parent song for deduplication */
  song_db_id: z.number().int().positive(),
  title: z.string(),
  artist: z.string(),
  difficulty: z.string(),
  rating: z.number().int(),
});

export const songCandidateSchema = z.object({
  song_db_id: z.number().int().positive(),
  title: z.string(),
  artist: z.string(),
});

export type SongCandidate = z.infer<typeof songCandidateSchema>;

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

export type VisionScreenContext = {
  played_player?: SelectedPlayer | null;
  played_player_confidence?: number;
  played_player_reason?: string;
};
