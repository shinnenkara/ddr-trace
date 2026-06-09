import { z } from "zod";

export const previewDifficultyOptionSchema = z.object({
  songId: z.number().int().positive(),
  difficulty: z.string(),
  rating: z.number().int(),
});

export const previewPlayRowSchema = z.object({
  stage: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  songId: z.number().int().positive(),
  title: z.string(),
  artist: z.string(),
  difficulty: z.string(),
  arcadeScore: z.number().int().min(0).max(1000000),
  resolveConfidence: z.number(),
  difficultyOptions: z.array(previewDifficultyOptionSchema).default([]),
  visionTitle: z.string().optional(),
  playedAt: z.string().optional(),
});

export const confirmPhotoMatchSchema = z.object({
  user_id: z.string(),
  played_at: z.preprocess((val) => new Date(String(val)), z.date()),
  rows: z.array(previewPlayRowSchema).min(1),
});

export type ConfirmPhotoMatchInput = z.infer<typeof confirmPhotoMatchSchema>;
