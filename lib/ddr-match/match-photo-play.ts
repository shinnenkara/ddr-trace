import type { DdrCapture, DdrResolvedPlays, StageVision } from "./ai-results-schema";
import type { PhotoMatchOutcome, PreviewPlayRow } from "./photo-match-outcome";
import {
  parseResultsScreenVision,
  resolvePlaysFromCandidates,
  throwAiError,
} from "./get-ai-ddr-results";
import { searchCandidatesForVision } from "./search-candidates-for-vision";
import {
  filterUsableStages,
  stageHasExtractableSignal,
} from "./normalize-ai-results";
import { getSongsByIds } from "@/lib/user-played-songs/search-songs-for-match";
import { insertPlayedSongs } from "@/lib/user-played-songs/insert-played-songs";
import type { LogPlayResult } from "@/lib/user-played-songs/user-played-song";
import { logPhotoMatchFailure } from "./log-match-failure";
import {
  MIN_RESOLVE_CONFIDENCE,
  MIN_SCORE_SIDE_CONFIDENCE,
  VISION_ERROR_TOO_BLURRY,
} from "./vision-errors";

type MatchPhotoPlayOptions = {
  hint?: string | null;
  forceAutoLog?: boolean;
};

function visionTitleForStage(stage: StageVision): string | undefined {
  return stage.title_candidates[0]?.title;
}

function rowConfidence(stage: StageVision, resolveConfidence: number): number {
  let confidence = resolveConfidence;

  if (stage.score_confidence > 0) {
    confidence = Math.min(confidence, stage.score_confidence);
  }

  if (
    stage.score_layout === "dual" &&
    stage.score_side_confidence < MIN_SCORE_SIDE_CONFIDENCE
  ) {
    confidence = Math.min(confidence, stage.score_side_confidence);
  }

  return confidence;
}

function computeOverallConfidence(
  stages: StageVision[],
  plays: DdrResolvedPlays["plays"],
): number {
  if (plays.length === 0) {
    return 0;
  }

  return Math.min(
    ...plays.map((play) => {
      const stage = stages.find((entry) => entry.stage === play.stage);
      if (!stage) {
        return play.resolve_confidence;
      }
      return rowConfidence(stage, play.resolve_confidence);
    }),
  );
}

async function insertResolvedPlays(
  capture: DdrCapture,
  resolved: DdrResolvedPlays,
): Promise<LogPlayResult> {
  const songIds = resolved.plays.map((play) => play.song_id);
  const songs = await getSongsByIds(songIds);
  const songIdSet = new Set(songs.map((song) => song.id));

  for (const play of resolved.plays) {
    if (!songIdSet.has(play.song_id)) {
      throw new Error(
        `Matched song id ${play.song_id} was not found in database`,
      );
    }
  }

  const batchId = crypto.randomUUID();

  const plays = await insertPlayedSongs(
    resolved.plays.map((play) => ({
      userId: capture.user_id,
      songId: play.song_id,
      arcadeScore: play.arcade_score,
      stage: play.stage ?? null,
      batchId,
      playedAt: capture.played_at,
      source: "photo" as const,
    })),
  );

  return { plays, batchId };
}

async function buildPreviewRows(
  stages: StageVision[],
  resolved: DdrResolvedPlays,
): Promise<PreviewPlayRow[]> {
  const songIds = resolved.plays.map((play) => play.song_id);
  const songs = await getSongsByIds(songIds);
  const songById = new Map(songs.map((song) => [song.id, song]));

  const rows: PreviewPlayRow[] = [];

  for (const play of resolved.plays) {
    const song = songById.get(play.song_id);
    const stageVision = stages.find((stage) => stage.stage === play.stage);

    if (!song || play.stage == null) {
      continue;
    }

    const row: PreviewPlayRow = {
      stage: play.stage as 1 | 2 | 3,
      songId: play.song_id,
      title: song.title,
      artist: song.artist,
      difficulty: song.difficulty,
      arcadeScore: play.arcade_score,
      resolveConfidence: play.resolve_confidence,
    };

    const visionTitle = stageVision ? visionTitleForStage(stageVision) : undefined;
    if (visionTitle) {
      row.visionTitle = visionTitle;
    }

    rows.push(row);
  }

  return rows;
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

    if (
      usableStages.length === 0 ||
      !vision.stages.some(stageHasExtractableSignal)
    ) {
      throwAiError(VISION_ERROR_TOO_BLURRY, "transient", {
        userId: capture.user_id,
        chartType: capture.chart_type,
        playerSide: capture.player_side,
        visionStages: vision.stages,
      });
    }

    const candidatesByStage = await searchCandidatesForVision(
      usableStages,
      capture.chart_type,
    );

    const resolved = await resolvePlaysFromCandidates(
      usableStages,
      candidatesByStage,
      {
        hint: options.hint ?? capture.hint,
      },
    );

    const overallConfidence = computeOverallConfidence(
      usableStages,
      resolved.plays,
    );

    if (!options.forceAutoLog && overallConfidence < MIN_RESOLVE_CONFIDENCE) {
      const rows = await buildPreviewRows(usableStages, resolved);
      return { mode: "preview", rows, overallConfidence };
    }

    const result = await insertResolvedPlays(capture, resolved);
    return { mode: "logged", result };
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
  capture: Pick<DdrCapture, "user_id" | "played_at">,
  rows: PreviewPlayRow[],
): Promise<LogPlayResult> {
  const songIds = rows.map((row) => row.songId);
  const songs = await getSongsByIds(songIds);
  const songIdSet = new Set(songs.map((song) => song.id));

  for (const row of rows) {
    if (!songIdSet.has(row.songId)) {
      throw new Error(`Song id ${row.songId} was not found in database`);
    }
  }

  const batchId = crypto.randomUUID();

  const plays = await insertPlayedSongs(
    rows.map((row) => ({
      userId: capture.user_id,
      songId: row.songId,
      arcadeScore: row.arcadeScore,
      stage: row.stage,
      batchId,
      playedAt: capture.played_at,
      source: "photo" as const,
    })),
  );

  return { plays, batchId };
}
