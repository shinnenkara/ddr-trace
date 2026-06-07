import { z } from "zod";
import { DIFFICULTY_COLORS } from "./difficulty-colors";
import { MAX_ARCADE_SCORE } from "@/lib/user-played-songs/chart-math";

export const ddrParsedEntrySchema = z.object({
  stage: z.number().int().min(1).max(3).nullable().optional(),
  title: z.string().min(1),
  difficulty_color: z.enum(DIFFICULTY_COLORS),
  arcade_score: z.number().int().min(0).max(MAX_ARCADE_SCORE),
});

export type DdrParsedEntry = z.infer<typeof ddrParsedEntrySchema>;

export const ddrScreenParseSuccessSchema = z.object({
  status: z.literal("success"),
  entries: z.array(ddrParsedEntrySchema).min(1).max(3),
});

export const ddrScreenParseErrorSchema = z.object({
  status: z.literal("error"),
  error: z.string().min(1),
  error_kind: z.enum(["content", "transient"]),
});

export const ddrScreenParseSchema = z.discriminatedUnion("status", [
  ddrScreenParseSuccessSchema,
  ddrScreenParseErrorSchema,
]);

export type DdrScreenParseResult = z.infer<typeof ddrScreenParseSchema>;

export const ddrResolvedPlaySchema = z.object({
  song_id: z.number().int().positive(),
  stage: z.number().int().min(1).max(3).nullable().optional(),
  arcade_score: z.number().int().min(0).max(MAX_ARCADE_SCORE),
  match_reason: z.string().min(1),
});

export const ddrResolvedPlaysSchema = z.object({
  plays: z.array(ddrResolvedPlaySchema).min(1).max(3),
});

export type DdrResolvedPlays = z.infer<typeof ddrResolvedPlaysSchema>;

export type DdrCapture = {
  capture_base64: string;
  name: string;
  mime: string;
  hint?: string | null;
  user_id: string;
  played_at: Date;
};
