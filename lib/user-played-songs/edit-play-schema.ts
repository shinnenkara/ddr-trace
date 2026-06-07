import { z } from "zod";
import {
  arcadeScoreSchema,
  stageSchema,
} from "./log-play-schema";

export const exScoreSchema = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? null : val),
  z.coerce.number().int().min(0).nullable().optional(),
);

export const editPlaySchema = z.object({
  user_id: z.string(),
  play_id: z.coerce.number().int().positive(),
  arcade_score: arcadeScoreSchema,
  stage: stageSchema,
  speed_modifier: z.string().max(20).optional().nullable(),
  ex_score: exScoreSchema,
  played_at: z.preprocess((val) => new Date(String(val)), z.date()),
});

export type EditPlayInput = z.infer<typeof editPlaySchema>;

export const deletePlaySchema = z.object({
  user_id: z.string(),
  play_id: z.coerce.number().int().positive(),
});

export type DeletePlayInput = z.infer<typeof deletePlaySchema>;
