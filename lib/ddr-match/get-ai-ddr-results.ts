import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import type {
  DdrCapture,
  DerivedStageContext,
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

Do NOT pick a single player column in vision when both are visible — extract BOTH p1 and p2 per row. Do NOT match to database songs.

Priority order (most important first):
1. Per-player money scores (digits must be correct)
2. Per-player difficulty_border hypotheses (colored strip only, with short_reason)
3. title_candidates (center column song title hypotheses)

Behavior rules:
- List each visible song row top-to-bottom in stages[]. Row order IS the stage: 1st row = stage 1, 2nd = 2, 3rd = 3. Never read stage numbers from the screen.
- status "success" if ANY row has a score, title, or difficulty border on any player. Partial crops are valid.
- Never return readability "unreadable" if any digit or character is visible on any row.
- Only status "error" when literally zero extractable row data.

Per stage return:
- title_candidates: 0–10 hypotheses sorted by confidence
- p1: Player 1 (left column) stats when visible, else omit/null
- p2: Player 2 (right column) stats when visible, else omit/null

Per player (p1 / p2) when visible:
- score: money score integer (0–${MAX_ARCADE_SCORE.toLocaleString()}) or null
- difficulty_border: 0–3 hypotheses sorted by confidence, each with:
  - color: border strip color only (green/blue/yellow/red/purple)
  - confidence: 0–1
  - short_reason: required — cite spatial location ("strip right of B+ grade, before jacket") and what was ignored ("not Skip button", "not grade letter fill")
- grade: optional letter grade (A, B+, etc.) for debug — NEVER use grade color for difficulty_border

Border spatial guidance:
- p1: vertical colored strip immediately RIGHT of the P1 grade letter, between letter and song jacket
- p2: vertical colored strip immediately LEFT of the P2 grade letter, between jacket and grade letter
- IGNORE: grade letter fill (yellow A, blue B/B+), jacket art interior, background sparkles, score digit colors, green Skip button, yellow "24" badge

Border color legend:
${difficultyColorLegendForPrompt()}

Screen-level played_player (when user context is Auto):
- played_player: "p1" or "p2" — which column is the photographed player's run
- played_player_confidence: 0–1
- played_player_reason: short explanation (photo angle, larger/closer column, etc.)
When user specifies 1P or 2P: still extract both columns; played_player is optional.

On success: looks_like_ddr_results true, readability "clear" or "partial".`;

export function throwAiError(
  message: string,
  errorKind: "content" | "transient",
  context?: Record<string, unknown>,
): never {
  console.error(
    "[photo-match]",
    message,
    JSON.stringify({ errorKind, ...context }),
  );

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
      ? "\nUser player side: left (1P) — extract both p1 and p2 columns when visible; code will use p1."
      : capture.player_side === "right"
        ? "\nUser player side: right (2P) — extract both p1 and p2 columns when visible; code will use p2."
        : "\nUser player side: auto — extract both p1 and p2 columns when visible; also return played_player + played_player_confidence for the photographed player's column.";

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
    object = normalizeDdrVisionParse(raw);
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
  derivedContexts: DerivedStageContext[],
  candidatesByStage: ResolveCandidate[][],
  hint?: string | null,
): string {
  const stageBlocks = stages
    .map((stage, index) => {
      const derived = derivedContexts[index];
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

      const sessionOverride = derived?.difficulty_overridden_by_session_majority
        ? " (session majority override)"
        : "";

      return `Stage ${stage.stage}:
  Vision title candidates:
${titleLines || "    (none)"}
  selected_player: ${derived?.selected_player ?? "unknown"}
  difficulty_color: ${derived?.difficulty_color ?? "unknown"} (border_confidence ${(derived?.difficulty_border_confidence ?? 0).toFixed(2)})${sessionOverride}
  border_reason: ${derived?.difficulty_border_reason || "(none)"}
  arcade_score: ${derived?.score ?? "unknown"}
Database candidates (already filtered to user's chart type):
${candidateLines}`;
    })
    .join("\n\n");

  const hintLine = hint?.trim() ? `\nUser hint: ${hint.trim()}\n` : "";

  return `You are a DDR chart matching expert. Match each stage to exactly one song_id from that stage's database candidates.

Rules:
- Pick song_id ONLY from the candidates list for each stage.
- Match title hypotheses and difficulty_color together when possible.
- difficulty_color comes from the selected player's grade panel border, not the grade letter.
- Strongly prefer candidates whose difficulty matches difficulty_color when border_confidence is high.
- If border_confidence is low, weight title more but still prefer difficulty match when title is ambiguous.
- difficulty_color maps to difficulty labels:
${difficultyColorLegendForPrompt()}
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
  derivedContexts: DerivedStageContext[],
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
    prompt: buildResolvePrompt(
      stages,
      derivedContexts,
      candidatesByStage,
      hint,
    ),
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
  derivedContexts: DerivedStageContext[],
  candidatesByStage: ResolveCandidate[][],
  options: ResolveOptions = {},
): Promise<DdrResolvedPlays> {
  const { resolved, ambiguousStages, ambiguousDerived, ambiguousCandidates } =
    tryDeterministicResolve(stages, derivedContexts, candidatesByStage);

  const aiResolved = await resolveAmbiguousStages(
    ambiguousStages,
    ambiguousDerived,
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
