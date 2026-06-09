import { z } from "zod";
import { CHART_TYPES } from "@/lib/ddr-match/ai-results-schema";

export const previewSongOptionSchema = z.object({
  songDbId: z.number().int().positive(),
  title: z.string(),
  artist: z.string(),
  matchScore: z.number(),
  manual: z.boolean().optional(),
});

export const previewDifficultyOptionSchema = z.object({
  songId: z.number().int().positive(),
  difficulty: z.string(),
  rating: z.number().int(),
  suggested: z.boolean().optional(),
});

export const previewPlayRowSchema = z.object({
  stage: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  songDbId: z.number().int().positive(),
  title: z.string(),
  artist: z.string(),
  songOptions: z.array(previewSongOptionSchema).min(1),
  songId: z.number().int().positive(),
  difficulty: z.string(),
  difficultyOptions: z.array(previewDifficultyOptionSchema).min(1),
  arcadeScore: z.number().int().min(0).max(1000000),
  matchScore: z.number(),
  matchSource: z.enum(["ranked", "manual"]),
  suggestedDifficultyColor: z
    .enum(["green", "blue", "yellow", "red", "purple"])
    .nullable()
    .optional(),
  visionTitle: z.string().optional(),
  playedAt: z.string().optional(),
});

export const confirmPhotoMatchSchema = z.object({
  user_id: z.string(),
  played_at: z.preprocess((val) => new Date(String(val)), z.date()),
  chart_type: z.enum(CHART_TYPES).default("single"),
  rows: z.array(previewPlayRowSchema).min(1),
});

export type ConfirmPhotoMatchInput = z.infer<typeof confirmPhotoMatchSchema>;
