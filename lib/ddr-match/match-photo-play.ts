import type {
  ChartType,
  DdrCapture,
  DerivedStageContext,
  DdrResolvedPlay,
  DdrVisionParseResult,
  ResolveCandidate,
  StageVision,
} from "./ai-results-schema";
import type {
  PhotoMatchOutcome,
  PreviewDifficultyOption,
  PreviewPlayRow,
  PreviewSongOption,
} from "./photo-match-outcome";
import type { RankedSong } from "./rank-candidates";
import {
  parseResultsScreenVision,
  resolvePlaysFromCandidates,
} from "./get-ai-ddr-results";
import { searchCandidatesForVision } from "./search-candidates-for-vision";
import { filterCandidatesByDifficulty } from "./filter-candidates-by-difficulty";
import { deriveStageContexts } from "./derive-stage-context";
import { filterUsableStages } from "./normalize-ai-results";
import {
  buildDifficultyOptions,
  pickDefaultVariant,
  variantsForSong,
} from "./pick-default-difficulty";
import { getVariantsByIds } from "@/lib/user-played-songs/search-songs-for-match";
import { insertPlayedSongs } from "@/lib/user-played-songs/insert-played-songs";
import type { LogPlayResult } from "@/lib/user-played-songs/user-played-song";
import { logPhotoMatchFailure } from "./log-match-failure";
import { logPhotoMatchTrace } from "./log-match-trace";
import { MIN_SCORE_SIDE_CONFIDENCE } from "./vision-errors";

type MatchPhotoPlayOptions = {
  hint?: string | null;
};

function visionTitleForStage(stage: StageVision): string | undefined {
  return stage.title_candidates[0]?.title;
}

function rowConfidence(
  derived: DerivedStageContext | undefined,
  matchScore: number,
): number {
  let confidence = matchScore;

  if (
    derived?.score_layout === "dual" &&
    derived.score_side_confidence < MIN_SCORE_SIDE_CONFIDENCE
  ) {
    confidence = Math.min(confidence, derived.score_side_confidence);
  }

  if (derived && derived.difficulty_border_confidence > 0) {
    confidence = Math.min(confidence, derived.difficulty_border_confidence);
  }

  return confidence;
}

function computeOverallConfidence(
  derivedContexts: DerivedStageContext[],
  plays: DdrResolvedPlay[],
): number {
  if (plays.length === 0) {
    return 0;
  }

  return Math.min(
    ...plays.map((play) => {
      const derived = derivedContexts.find(
        (entry) => entry.stage === play.stage,
      );
      return rowConfidence(derived, play.resolve_confidence);
    }),
  );
}

function visionScreenContext(
  vision: Extract<DdrVisionParseResult, { status: "success" }>,
) {
  return {
    played_player: vision.played_player ?? null,
    played_player_confidence: vision.played_player_confidence,
    played_player_reason: vision.played_player_reason,
  };
}

function toSongOptions(ranked: RankedSong[]): PreviewSongOption[] {
  return ranked.map((song) => ({
    songDbId: song.song_db_id,
    title: song.title,
    artist: song.artist,
    matchScore: song.matchScore,
  }));
}

function buildPreviewRow(
  stage: StageVision,
  play: DdrResolvedPlay,
  derived: DerivedStageContext | undefined,
  rankedSongs: RankedSong[],
  candidates: ResolveCandidate[],
): PreviewPlayRow | null {
  if (play.stage == null) {
    return null;
  }

  const songOptions = toSongOptions(rankedSongs);
  const selectedVariant = candidates.find(
    (candidate) => candidate.song_id === play.song_id,
  );
  const selectedSongDbId =
    selectedVariant?.song_db_id ?? rankedSongs[0]?.song_db_id;

  if (!selectedSongDbId) {
    return null;
  }

  const selectedSong =
    rankedSongs.find((song) => song.song_db_id === selectedSongDbId) ??
    rankedSongs[0];

  const songVariants = variantsForSong(candidates, selectedSongDbId);
  const defaultVariant =
    selectedVariant ?? pickDefaultVariant(songVariants, derived);

  if (!defaultVariant || !selectedSong) {
    return null;
  }

  const difficultyOptions: PreviewDifficultyOption[] = buildDifficultyOptions(
    songVariants,
    derived,
  );

  const row: PreviewPlayRow = {
    stage: play.stage as 1 | 2 | 3,
    songDbId: selectedSongDbId,
    title: selectedSong.title,
    artist: selectedSong.artist,
    songOptions,
    songId: defaultVariant.song_id,
    difficulty: defaultVariant.difficulty,
    difficultyOptions,
    arcadeScore: play.arcade_score,
    matchScore: selectedSong.matchScore,
    matchSource: "ranked",
    suggestedDifficultyColor: derived?.difficulty_color ?? null,
  };

  const visionTitle = visionTitleForStage(stage);
  if (visionTitle) {
    row.visionTitle = visionTitle;
  }

  return row;
}

function buildPreviewRows(
  stages: StageVision[],
  plays: DdrResolvedPlay[],
  rankedSongsByStage: RankedSong[][],
  candidatesByStage: ResolveCandidate[][],
  derivedContexts: DerivedStageContext[],
): PreviewPlayRow[] {
  const rows: PreviewPlayRow[] = [];

  for (const play of plays) {
    const stageIndex = stages.findIndex((stage) => stage.stage === play.stage);
    const stage = stages[stageIndex];
    if (!stage) {
      continue;
    }

    const row = buildPreviewRow(
      stage,
      play,
      derivedContexts[stageIndex],
      rankedSongsByStage[stageIndex] ?? [],
      candidatesByStage[stageIndex] ?? [],
    );

    if (row) {
      rows.push(row);
    }
  }

  return rows;
}

function emptyPreviewOutcome(
  capture: DdrCapture,
  vision: Extract<DdrVisionParseResult, { status: "success" }>,
  visionStages: StageVision[],
): PhotoMatchOutcome {
  const screen = visionScreenContext(vision);

  logPhotoMatchTrace({
    playerSide: capture.player_side,
    chartType: capture.chart_type,
    screen,
    stages: visionStages,
    derivedContexts: [],
    resolved: { plays: [] },
    candidatesByStage: [],
    overallConfidence: 0,
    outcome: "empty_preview",
  });

  return { rows: [], overallConfidence: 0 };
}

export async function matchPhotoPlay(
  capture: DdrCapture,
  options: MatchPhotoPlayOptions = {},
): Promise<PhotoMatchOutcome> {
  let visionStages: StageVision[] | undefined;

  try {
    const vision = await parseResultsScreenVision(capture);

    const usableStages = filterUsableStages(vision.stages);
    visionStages = vision.stages;

    if (usableStages.length === 0) {
      return emptyPreviewOutcome(capture, vision, vision.stages);
    }

    const screen = visionScreenContext(vision);
    const derivedContexts = deriveStageContexts(
      usableStages,
      capture.player_side,
      screen,
    );

    const candidatesByStage = await searchCandidatesForVision(
      usableStages,
      capture.chart_type,
    );

    const filteredCandidates = filterCandidatesByDifficulty(
      derivedContexts,
      candidatesByStage,
    );

    const candidateCounts = candidatesByStage.map((candidates, index) => ({
      before: candidates.length,
      after: filteredCandidates[index]?.length ?? 0,
    }));

    const resolved = await resolvePlaysFromCandidates(
      usableStages,
      derivedContexts,
      filteredCandidates,
      {
        hint: options.hint ?? capture.hint,
      },
    );
    const plays = resolved.plays;
    const rankedSongsByStage = resolved.rankedSongsByStage;

    const rows = buildPreviewRows(
      usableStages,
      plays,
      rankedSongsByStage,
      filteredCandidates,
      derivedContexts,
    );

    if (rows.length === 0) {
      return emptyPreviewOutcome(capture, vision, vision.stages);
    }

    const overallConfidence = computeOverallConfidence(
      derivedContexts,
      plays,
    );

    const outcome: PhotoMatchOutcome = {
      rows,
      overallConfidence,
    };

    logPhotoMatchTrace({
      playerSide: capture.player_side,
      chartType: capture.chart_type,
      screen,
      stages: usableStages,
      derivedContexts,
      resolved: { plays },
      candidatesByStage: candidateCounts,
      overallConfidence,
      outcome: "preview",
    });

    return outcome;
  } catch (err) {
    logPhotoMatchFailure(err, {
      userId: capture.user_id,
      chartType: capture.chart_type,
      playerSide: capture.player_side,
      visionStages,
    });
    throw err;
  }
}

export async function confirmPhotoMatchPlays(
  capture: Pick<DdrCapture, "user_id" | "played_at"> & {
    chart_type: ChartType;
  },
  rows: PreviewPlayRow[],
): Promise<LogPlayResult> {
  const variantIds = rows.map((row) => row.songId);
  const variants = await getVariantsByIds(variantIds);
  const variantById = new Map(variants.map((variant) => [variant.id, variant]));

  for (const row of rows) {
    const variant = variantById.get(row.songId);
    if (!variant) {
      throw new Error(`Song id ${row.songId} was not found in database`);
    }
    if (variant.type !== capture.chart_type) {
      throw new Error(
        `Chart type "${capture.chart_type}" does not match song id ${row.songId}`,
      );
    }
    if (row.matchSource === "ranked") {
      const allowedSongIds = new Set(
        row.songOptions.map((option) => option.songDbId),
      );
      if (!allowedSongIds.has(row.songDbId)) {
        throw new Error(
          `Song db id ${row.songDbId} is not in ranked song options for stage ${row.stage}`,
        );
      }

      const allowedVariantIds = new Set(
        row.difficultyOptions.map((option) => option.songId),
      );
      if (!allowedVariantIds.has(row.songId)) {
        throw new Error(
          `Song id ${row.songId} is not in difficulty options for stage ${row.stage}`,
        );
      }
    }

    if (variant.songId !== row.songDbId) {
      throw new Error(
        `Song db id ${row.songDbId} does not match variant ${row.songId}`,
      );
    }
    if (variant.difficulty !== row.difficulty) {
      throw new Error(
        `Difficulty "${row.difficulty}" does not match song id ${row.songId}`,
      );
    }
  }

  const batchId = crypto.randomUUID();

  const plays = await insertPlayedSongs(
    rows.map((row) => ({
      userId: capture.user_id,
      songVariantId: row.songId,
      arcadeScore: row.arcadeScore,
      stage: row.stage,
      batchId,
      playedAt: row.playedAt ? new Date(row.playedAt) : capture.played_at,
      source: "photo" as const,
    })),
  );

  return { plays, batchId };
}
