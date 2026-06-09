import type {
  DerivedStageContext,
  DdrResolvedPlay,
  ResolveCandidate,
  SongCandidate,
  StageVision,
  TitleCandidate,
} from "./ai-results-schema";
import { dedupeCandidatesToSongs } from "./search-term-utils";
import { pickDefaultVariant } from "./pick-default-difficulty";

export type RankedSong = SongCandidate & {
  matchScore: number;
  matchReason: string;
};

/** @deprecated Use RankedSong for song-level ranking. */
export type RankedCandidate = ResolveCandidate & {
  matchScore: number;
  matchReason: string;
};

function normalizeText(value: string): string {
  return value.normalize("NFC").toLowerCase().trim();
}

function tokenize(value: string): string[] {
  return value
    .split(/[\s\-_/]+/)
    .map((token) => token.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((token) => token.length >= 2);
}

function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) {
    return 0;
  }

  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;

  for (const token of setA) {
    if (setB.has(token)) {
      intersection++;
    }
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function titleSimilarity(
  hypothesis: string,
  candidateTitle: string,
  candidateArtist: string,
): { score: number; reason: string } {
  const normalizedHypothesis = normalizeText(hypothesis);
  const normalizedTitle = normalizeText(candidateTitle);
  const normalizedArtist = normalizeText(candidateArtist);

  if (!normalizedHypothesis) {
    return { score: 0, reason: "" };
  }

  if (normalizedHypothesis === normalizedTitle) {
    return { score: 1, reason: "exact title" };
  }

  if (
    normalizedTitle.includes(normalizedHypothesis) ||
    normalizedHypothesis.includes(normalizedTitle)
  ) {
    return { score: 0.85, reason: "title substring" };
  }

  const hypothesisTokens = tokenize(normalizedHypothesis);
  const titleTokens = tokenize(normalizedTitle);
  const tokenOverlap = jaccardSimilarity(hypothesisTokens, titleTokens);

  if (tokenOverlap >= 0.5) {
    return { score: 0.5 + tokenOverlap * 0.3, reason: "title token overlap" };
  }

  if (
    normalizedArtist.includes(normalizedHypothesis) ||
    normalizedHypothesis.includes(normalizedArtist)
  ) {
    return { score: 0.4, reason: "artist match" };
  }

  return { score: 0, reason: "" };
}

function bestTitleScoreForSong(
  hypotheses: TitleCandidate[],
  song: SongCandidate,
): { score: number; reason: string } {
  let best = { score: 0, reason: "no title match" };

  for (const hypothesis of hypotheses) {
    const { score: similarity, reason } = titleSimilarity(
      hypothesis.title,
      song.title,
      song.artist,
    );
    const weighted = hypothesis.confidence * similarity;

    if (weighted > best.score) {
      best = {
        score: weighted,
        reason: reason || "title hypothesis",
      };
    }
  }

  return best;
}

export function rankSongsForStage(
  stage: StageVision,
  candidates: ResolveCandidate[],
): RankedSong[] {
  const songs = dedupeCandidatesToSongs(candidates);

  const ranked = songs.map((song) => {
    const title = bestTitleScoreForSong(stage.title_candidates, song);
    return {
      ...song,
      matchScore: title.score,
      matchReason: title.reason,
    };
  });

  return ranked.sort((a, b) => b.matchScore - a.matchScore);
}

export function rankSongsByStage(
  stages: StageVision[],
  candidatesByStage: ResolveCandidate[][],
): RankedSong[][] {
  return stages.map((stage, index) =>
    rankSongsForStage(stage, candidatesByStage[index] ?? []),
  );
}

export function pickTopRankedPlay(
  stage: StageVision,
  derived: DerivedStageContext,
  rankedSongs: RankedSong[],
  candidates: ResolveCandidate[],
): DdrResolvedPlay | null {
  const topSong = rankedSongs[0];
  if (!topSong || derived.score === null) {
    return null;
  }

  const songVariants = candidates.filter(
    (candidate) => candidate.song_db_id === topSong.song_db_id,
  );
  const defaultVariant = pickDefaultVariant(songVariants, derived);

  if (!defaultVariant) {
    return null;
  }

  return {
    song_id: defaultVariant.song_id,
    stage: stage.stage,
    arcade_score: derived.score,
    match_reason: `Heuristic match: ${topSong.matchReason}`,
    resolve_confidence: topSong.matchScore,
  };
}

export function resolveAmbiguousStagesHeuristic(
  stages: StageVision[],
  derivedContexts: DerivedStageContext[],
  candidatesByStage: ResolveCandidate[][],
): DdrResolvedPlay[] {
  const plays: DdrResolvedPlay[] = [];

  for (let index = 0; index < stages.length; index++) {
    const stage = stages[index];
    const derived = derivedContexts[index];
    const candidates = candidatesByStage[index] ?? [];
    const rankedSongs = rankSongsForStage(stage, candidates);

    const play = derived
      ? pickTopRankedPlay(stage, derived, rankedSongs, candidates)
      : null;

    if (play) {
      plays.push(play);
    }
  }

  return plays;
}
