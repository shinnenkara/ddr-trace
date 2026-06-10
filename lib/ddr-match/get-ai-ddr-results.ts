import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import type {
  DdrCapture,
  DerivedStageContext,
  DdrResolvedPlay,
  DdrVisionParseResult,
  ResolveCandidate,
  StageVision,
} from "./ai-results-schema";
import {
  ddrVisionParseGeminiSchema,
  normalizeDdrVisionParse,
} from "./normalize-ai-results";
import { getGoogleGenerativeAiApiKey } from "./get-google-api-key";
import { tryDeterministicResolve } from "./deterministic-resolve";
import {
  rankSongsByStage,
  resolveAmbiguousStagesHeuristic,
  type RankedSong,
} from "./rank-candidates";
import {
  buildVisionSystemPrompt,
  buildVisionUserMessageText,
} from "./prompts/vision-prompt";

const VISION_MODEL_ID = "gemini-2.5-flash";

export type VisionOptions = {
  apiKey?: string;
  temperature?: number;
  seed?: number;
  /** Gemini input resolution for vision; defaults to high for difficulty-color accuracy. */
  mediaResolution?:
    | "MEDIA_RESOLUTION_UNSPECIFIED"
    | "MEDIA_RESOLUTION_LOW"
    | "MEDIA_RESOLUTION_MEDIUM"
    | "MEDIA_RESOLUTION_HIGH";
};

export type ResolvePlaysResult = {
  plays: DdrResolvedPlay[];
  rankedSongsByStage: RankedSong[][];
};

async function getVisionModel(apiKey?: string) {
  const resolvedKey = apiKey ?? (await getGoogleGenerativeAiApiKey());
  const google = createGoogleGenerativeAI({ apiKey: resolvedKey });
  return google(VISION_MODEL_ID);
}

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
  options: VisionOptions = {},
): Promise<Extract<DdrVisionParseResult, { status: "success" }>> {
  const model = await getVisionModel(options.apiKey);

  const mediaResolution =
    options.mediaResolution ?? "MEDIA_RESOLUTION_HIGH";

  const { output: raw } = await generateText({
    model,
    output: Output.object({
      schema: ddrVisionParseGeminiSchema,
    }),
    temperature: options.temperature,
    seed: options.seed,
    providerOptions: {
      google: {
        mediaResolution,
      },
    },
    system: buildVisionSystemPrompt(),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: buildVisionUserMessageText({
              playerSide: capture.player_side,
              hint: capture.hint,
            }),
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
      throwAiError("Resolved a play for an unknown stage", "transient", {
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

function filterAmbiguousStagesWithCandidates(
  ambiguousStages: StageVision[],
  ambiguousDerived: DerivedStageContext[],
  ambiguousCandidates: ResolveCandidate[][],
): {
  stages: StageVision[];
  derived: DerivedStageContext[];
  candidates: ResolveCandidate[][];
  skippedStages: number[];
} {
  const stages: StageVision[] = [];
  const derived: DerivedStageContext[] = [];
  const candidates: ResolveCandidate[][] = [];
  const skippedStages: number[] = [];

  for (let index = 0; index < ambiguousStages.length; index++) {
    const stageCandidates = ambiguousCandidates[index] ?? [];
    if (stageCandidates.length === 0) {
      skippedStages.push(ambiguousStages[index].stage);
      continue;
    }
    stages.push(ambiguousStages[index]);
    derived.push(ambiguousDerived[index]);
    candidates.push(stageCandidates);
  }

  return { stages, derived, candidates, skippedStages };
}

export async function resolvePlaysFromCandidates(
  stages: StageVision[],
  derivedContexts: DerivedStageContext[],
  candidatesByStage: ResolveCandidate[][],
  _options: ResolveOptions = {},
): Promise<ResolvePlaysResult> {
  const rankedSongsByStage = rankSongsByStage(stages, candidatesByStage);

  const { resolved, ambiguousStages, ambiguousDerived, ambiguousCandidates } =
    tryDeterministicResolve(stages, derivedContexts, candidatesByStage);

  const {
    stages: resolvableStages,
    derived: resolvableDerived,
    candidates: resolvableCandidates,
    skippedStages,
  } = filterAmbiguousStagesWithCandidates(
    ambiguousStages,
    ambiguousDerived,
    ambiguousCandidates,
  );

  if (skippedStages.length > 0) {
    console.warn(
      "[photo-match] skipped stages with no DB candidates",
      JSON.stringify({ stages: skippedStages }),
    );
  }

  const heuristicResolved = resolveAmbiguousStagesHeuristic(
    resolvableStages,
    resolvableDerived,
    resolvableCandidates,
  );

  const plays = [...resolved, ...heuristicResolved].sort(
    (a, b) => (a.stage ?? 0) - (b.stage ?? 0),
  );

  if (plays.length === 0) {
    return { plays: [], rankedSongsByStage };
  }

  assertCandidatesMembership(stages, candidatesByStage, plays);

  return { plays, rankedSongsByStage };
}
