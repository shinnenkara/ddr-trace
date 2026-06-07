import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import type {
  DdrCapture,
  DdrResolvedPlay,
  DdrResolvedPlays,
  DdrVisionParseResult,
  ResolveCandidate,
  StageVision,
} from "./ai-results-schema";
import {
  ddrVisionParseGeminiSchema,
  ddrResolvedPlaysGeminiSchema,
  normalizeDdrVisionParse,
  normalizeDdrResolvedPlays,
} from "./normalize-ai-results";
import { difficultyColorLegendForPrompt } from "./difficulty-colors";
import { MAX_ARCADE_SCORE } from "@/lib/user-played-songs/chart-math";
import { getGoogleGenerativeAiApiKey } from "./get-google-api-key";
import { tryDeterministicResolve } from "./deterministic-resolve";
import { VISION_ERROR_TOO_BLURRY } from "./vision-errors";

const VISION_MODEL_ID = "gemini-2.5-flash";
const RESOLVE_MODEL_ID = "gemini-2.5-flash-lite";

async function getVisionModel() {
  const apiKey = await getGoogleGenerativeAiApiKey();
  const google = createGoogleGenerativeAI({ apiKey });
  return google(VISION_MODEL_ID);
}

async function getResolveModel() {
  const apiKey = await getGoogleGenerativeAiApiKey();
  const google = createGoogleGenerativeAI({ apiKey });
  return google(RESOLVE_MODEL_ID);
}

const VISION_SYSTEM_PROMPT = `You are a DDR (Dance Dance Revolution) arcade results screen OCR expert.

Your mission is to extract row data from photos. Partial crops, glare, angle, and Japanese/non-Latin titles are normal — always extract what you can see.

Priority order (most important first):
1. Money scores per row — digits must be correct. Partial score columns are OK; use whichever column is visible.
2. Difficulty chart bar color (green/blue/yellow/red/purple) — ignore grade badge colors (AAA, AA, A, B, etc.).
3. Song title text as displayed — English, Japanese, katakana, symbols; partial fragments OK with multiple hypotheses.

Behavior rules:
- List each visible song row top-to-bottom in stages[]. Row order IS the stage: 1st row = stage 1, 2nd = 2, 3rd = 3. Never read stage numbers from the screen.
- status "success" if ANY row has a score OR title OR difficulty color. Partial crops without headers/backgrounds are valid.
- Never return readability "unreadable" if any digit or character is visible on any row.
- Do not reject for "not full results screen" when row data exists.
- Only status "error" when literally zero extractable row data (no scores, no title characters, no difficulty color on any row).

For each row return:
- title_candidates: 0–10 hypotheses sorted by confidence (partial reads → multiple lower-confidence candidates with honest short_reason)
- score_layout: "single" or "dual" (both 1P left and 2P right columns visible)
- left_score / right_score: money score integers or null
- arcade_score: selected score (0–${MAX_ARCADE_SCORE.toLocaleString()}) or null
- score_confidence: 0–1 confidence in arcade_score digits
- score_side / score_side_confidence / score_selection_reason
- difficulty_color and optional difficulty_color_alternates (max 2)

Two-player scores (dual layout):
- Read BOTH left_score and right_score when visible. Do not merge or average.
- If user specifies player side (see User context): always use that column; score_side_confidence ~1.0.
- If user side is auto: pick the column closer/larger in the photo; lower score_side_confidence when uncertain.
- If only one column readable: score_layout "single".

Difficulty color legend (chart bar only):
${difficultyColorLegendForPrompt()}

Do not match to database songs. Extract only what is visible in the image.
On success: looks_like_ddr_results true, readability "clear" or "partial".`;

export function throwAiError(
  message: string,
  errorKind: "content" | "transient",
  context?: Record<string, unknown>,
): never {
  console.error("[photo-match]", message, JSON.stringify({ errorKind, ...context }));

  const err = new Error(message) as Error & {
    errorKind?: "content" | "transient";
  };
  err.errorKind = errorKind;
  throw err;
}

export async function parseResultsScreenVision(
  capture: DdrCapture,
): Promise<Extract<DdrVisionParseResult, { status: "success" }>> {
  const hintText = capture.hint?.trim()
    ? `\nUser hint: ${capture.hint.trim()}`
    : "";

  const playerSideText =
    capture.player_side === "left"
      ? "\nUser player side: left (1P) — always use the left score column."
      : capture.player_side === "right"
        ? "\nUser player side: right (2P) — always use the right score column."
        : "\nUser player side: auto — infer closer/larger score column from photo perspective when dual scores are visible.";

  const model = await getVisionModel();

  const { object: raw } = await generateObject({
    model,
    schema: ddrVisionParseGeminiSchema,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: VISION_SYSTEM_PROMPT + playerSideText + hintText,
          },
          {
            type: "image",
            image: capture.capture_base64,
            mediaType: capture.mime as
              | "image/webp"
              | "image/jpeg"
              | "image/png",
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

  let object: DdrVisionParseResult;
  try {
    object = normalizeDdrVisionParse(raw, capture.player_side);
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
  stages: StageVision[],
  candidatesByStage: ResolveCandidate[][],
  hint?: string | null,
): string {
  const stageBlocks = stages
    .map((stage, index) => {
      const candidates = candidatesByStage[index] ?? [];
      const titleLines = stage.title_candidates
        .map(
          (candidate) =>
            `    - "${candidate.title}" (confidence ${candidate.confidence.toFixed(2)}: ${candidate.short_reason})`,
        )
        .join("\n");

      const candidateLines =
        candidates.length > 0
          ? candidates
              .map(
                (candidate) =>
                  `  - song_id=${candidate.song_id}, title="${candidate.title}", artist="${candidate.artist}", difficulty="${candidate.difficulty}", rating=${candidate.rating}`,
              )
              .join("\n")
          : "  (no candidates found)";

      const colorAlternates =
        stage.difficulty_color_alternates &&
        stage.difficulty_color_alternates.length > 0
          ? `, alternates: ${stage.difficulty_color_alternates.join(", ")}`
          : "";

      return `Stage ${stage.stage}:
  Vision title candidates:
${titleLines || "    (none)"}
  difficulty_color: ${stage.difficulty_color ?? "unknown"}${colorAlternates}
  arcade_score: ${stage.arcade_score ?? "unknown"} (score_confidence ${stage.score_confidence.toFixed(2)})
Database candidates (already filtered to user's chart type):
${candidateLines}`;
    })
    .join("\n\n");

  const hintLine = hint?.trim() ? `\nUser hint: ${hint.trim()}\n` : "";

  return `You are a DDR chart matching expert. Match each stage to exactly one song_id from that stage's database candidates.

Rules:
- Pick song_id ONLY from the candidates list for each stage.
- Match title hypotheses and difficulty_color together when possible.
- difficulty_color maps to difficulty labels (green=Beginner, blue=Basic, yellow=Difficult, red=Expert, purple=Challenge).
- Preserve arcade_score from vision unless clearly wrong.
- Return resolve_confidence 0–1 per play reflecting match certainty.
- If no candidate fits well, still pick the closest and set low resolve_confidence with explanation in match_reason.
- Return one play per row in the same order as the input. Do not include stage numbers — order determines stage.
${hintLine}
${stageBlocks}

Return one play object per row with song_id, arcade_score, match_reason, and resolve_confidence.`;
}

type ResolveOptions = {
  hint?: string | null;
  minConfidence?: number;
};

function assertCandidatesMembership(
  stages: StageVision[],
  candidatesByStage: ResolveCandidate[][],
  plays: DdrResolvedPlay[],
): void {
  const expectedStageNumbers = stages.map((stage) => stage.stage);

  for (const play of plays) {
    const stageIndex = stages.findIndex((stage) => stage.stage === play.stage);
    if (stageIndex === -1) {
      throwAiError("AI returned a play for an unknown stage", "transient", {
        expectedStages: expectedStageNumbers,
        returnedStage: play.stage,
        returnedSongId: play.song_id,
      });
    }

    const candidates = candidatesByStage[stageIndex] ?? [];
    if (!candidates.some((candidate) => candidate.song_id === play.song_id)) {
      throwAiError(
        `Matched song id ${play.song_id} was not in database candidates`,
        "transient",
        {
          stage: play.stage,
          songId: play.song_id,
          candidateCount: candidates.length,
        },
      );
    }
  }
}

async function resolveAmbiguousStages(
  stages: StageVision[],
  candidatesByStage: ResolveCandidate[][],
  hint?: string | null,
): Promise<DdrResolvedPlay[]> {
  if (stages.length === 0) {
    return [];
  }

  const model = await getResolveModel();

  const { object: raw } = await generateObject({
    model,
    schema: ddrResolvedPlaysGeminiSchema,
    prompt: buildResolvePrompt(stages, candidatesByStage, hint),
  });

  const normalized = normalizeDdrResolvedPlays(raw, stages);

  if (normalized.plays.length !== stages.length) {
    throwAiError(
      "AI returned an unexpected number of resolved plays",
      "transient",
    );
  }

  return normalized.plays;
}

export async function resolvePlaysFromCandidates(
  stages: StageVision[],
  candidatesByStage: ResolveCandidate[][],
  options: ResolveOptions = {},
): Promise<DdrResolvedPlays> {
  const { resolved, ambiguousStages, ambiguousCandidates } =
    tryDeterministicResolve(stages, candidatesByStage);

  const aiResolved = await resolveAmbiguousStages(
    ambiguousStages,
    ambiguousCandidates,
    options.hint,
  );

  const plays = [...resolved, ...aiResolved].sort(
    (a, b) => (a.stage ?? 0) - (b.stage ?? 0),
  );

  if (plays.length === 0) {
    throwAiError(VISION_ERROR_TOO_BLURRY, "transient");
  }

  assertCandidatesMembership(stages, candidatesByStage, plays);

  return { plays };
}
