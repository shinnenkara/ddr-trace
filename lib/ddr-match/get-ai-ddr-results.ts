import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import type { DdrCapture } from "./ai-results-schema";
import {
  ddrScreenParseGeminiSchema,
  ddrResolvedPlaysGeminiSchema,
  normalizeDdrScreenParse,
  normalizeDdrResolvedPlays,
} from "./normalize-ai-results";
import {
  type DdrParsedEntry,
  type DdrScreenParseResult,
  type DdrResolvedPlays,
} from "./ai-results-schema";
import { difficultyColorLegendForPrompt } from "./difficulty-colors";
import type { Song } from "@/lib/db/schema";
import { MAX_ARCADE_SCORE } from "@/lib/user-played-songs/chart-math";
import { getGoogleGenerativeAiApiKey } from "./get-google-api-key";

const MODEL_ID = "gemini-2.5-flash-lite";

async function getGoogleModel() {
  const apiKey = await getGoogleGenerativeAiApiKey();
  const google = createGoogleGenerativeAI({ apiKey });
  return google(MODEL_ID);
}

const PARSE_SYSTEM_PROMPT = `You are a DDR (Dance Dance Revolution) arcade results screen expert.

Analyze the image and determine if it shows a DDR arcade FINAL RESULTS screen after a credit (1–3 songs).

If valid, set status to "success" and extract each song row showing:
- stage: set slot number (1, 2, or 3) shown on the results screen
- title: song name as displayed
- difficulty_color: exactly one of green, blue, yellow, red, purple (see legend below)
- arcade_score: integer Money Score (0–${MAX_ARCADE_SCORE.toLocaleString()})

Difficulty color legend:
${difficultyColorLegendForPrompt()}

If the image is NOT a DDR final results screen, or text is unreadable, return status "error" with error_kind "content".
For temporary failures (blur, glare making read impossible but likely valid screen), return status "error" with error_kind "transient".`;

function throwAiError(message: string, errorKind: "content" | "transient"): never {
  const err = new Error(message) as Error & { errorKind?: "content" | "transient" };
  err.errorKind = errorKind;
  throw err;
}

export async function parseResultsScreen(
  capture: DdrCapture,
): Promise<DdrScreenParseResult> {
  const hintText = capture.hint?.trim()
    ? `\nUser hint: ${capture.hint.trim()}`
    : "";

  const model = await getGoogleModel();

  const { object: raw } = await generateObject({
    model,
    schema: ddrScreenParseGeminiSchema,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: PARSE_SYSTEM_PROMPT + hintText },
          {
            type: "image",
            image: capture.capture_base64,
            mediaType: capture.mime as "image/webp" | "image/jpeg" | "image/png",
          },
        ],
      },
    ],
  }).catch((err: unknown) => {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("Failed to analyze results screen");
  });

  let object: DdrScreenParseResult;
  try {
    object = normalizeDdrScreenParse(raw);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to parse AI response";
    throwAiError(message, "content");
  }

  if (object.status === "error") {
    throwAiError(object.error, object.error_kind);
  }

  return object;
}

function buildResolvePrompt(
  entries: DdrParsedEntry[],
  candidatesByIndex: Song[][],
  hint?: string | null,
): string {
  const entryBlocks = entries
    .map((entry, index) => {
      const candidates = candidatesByIndex[index] ?? [];
      const candidateLines =
        candidates.length > 0
          ? candidates
              .map(
                (c) =>
                  `  - id=${c.id}, title="${c.title}", artist="${c.artist}", type=${c.type}, difficulty="${c.difficulty}", rating=${c.rating}`,
              )
              .join("\n")
          : "  (no candidates found)";

      return `Entry ${index + 1} from photo:
  stage: ${entry.stage ?? "unknown"}
  title: "${entry.title}"
  difficulty_color: ${entry.difficulty_color}
  arcade_score: ${entry.arcade_score}
Database candidates:
${candidateLines}`;
    })
    .join("\n\n");

  const hintLine = hint?.trim() ? `\nUser hint: ${hint.trim()}\n` : "";

  return `You are a DDR chart matching expert. Match each photo entry to exactly one song_id from the database candidates.

Rules:
- Pick song_id from the candidates list for each entry. If no candidate fits, pick the closest match and explain in match_reason.
- Preserve stage and arcade_score from the photo entry unless clearly wrong.
- difficulty_color maps to difficulty labels (green=Beginner, blue=Basic, yellow=Difficult, red=Expert, purple=Challenge).
- Prefer matching difficulty and title together.
${hintLine}
${entryBlocks}

Return one play object per photo entry with song_id, stage, arcade_score, and match_reason.`;
}

export async function resolvePlaysFromCandidates(
  entries: DdrParsedEntry[],
  candidatesByIndex: Song[][],
  hint?: string | null,
): Promise<DdrResolvedPlays> {
  const model = await getGoogleModel();

  const { object: raw } = await generateObject({
    model,
    schema: ddrResolvedPlaysGeminiSchema,
    prompt: buildResolvePrompt(entries, candidatesByIndex, hint),
  });

  return normalizeDdrResolvedPlays(raw);
}
