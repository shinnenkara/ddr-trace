import { z } from "zod";

export const previewPlayRowSchema = z.object({
  stage: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  songId: z.number().int().positive(),
  title: z.string(),
  artist: z.string(),
  difficulty: z.string(),
  arcadeScore: z.number().int(),
  resolveConfidence: z.number(),
  visionTitle: z.string().optional(),
});

export const confirmPhotoMatchSchema = z.object({
  user_id: z.string(),
  played_at: z.preprocess((val) => new Date(String(val)), z.date()),
  rows: z.array(previewPlayRowSchema).min(1).max(3),
});

export type ConfirmPhotoMatchInput = z.infer<typeof confirmPhotoMatchSchema>;
