import { z } from "zod";
import {
  CHART_TYPES,
  PLAYER_SIDES,
  type DdrCapture,
} from "./ai-results-schema";

export const ddrCaptureSchema = z.object({
  capture_base64: z
    .string()
    .refine((src) => src.includes("base64,"), {
      message: "Invalid image format: base64 encoding not found",
    })
    .transform((src) => src.split("base64,")[1]),
  name: z.string(),
  mime: z.string(),
  hint: z.string().max(200).nullable().optional(),
  chart_type: z.enum(CHART_TYPES).default("single"),
  player_side: z.enum(PLAYER_SIDES).default("auto"),
  played_at: z.preprocess((val) => new Date(String(val)), z.date()),
  user_id: z.string(),
}) as z.ZodType<DdrCapture>;
