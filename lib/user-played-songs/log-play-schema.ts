import { z } from "zod";
import { MAX_ARCADE_SCORE } from "./chart-math";

export const arcadeScoreSchema = z.coerce
  .number()
  .int()
  .min(0, "Score must be at least 0")
  .max(MAX_ARCADE_SCORE, `Score must be at most ${MAX_ARCADE_SCORE.toLocaleString()}`);

export const stageSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(3)
  .optional()
  .nullable();

export const logPlayManualSchema = z.object({
  user_id: z.string(),
  song_id: z.coerce.number().int().positive(),
  arcade_score: arcadeScoreSchema,
  stage: stageSchema,
  speed_modifier: z.string().max(20).optional().nullable(),
  played_at: z.preprocess((val) => new Date(String(val)), z.date()),
});

export type LogPlayManualInput = z.infer<typeof logPlayManualSchema>;

export const searchSongsSchema = z.object({
  q: z.string().max(200).default(""),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
