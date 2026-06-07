import type { StageVision, ResolveCandidate } from "./ai-results-schema";
import type { Song } from "@/lib/db/schema";

const MIN_SEARCH_TERM_LENGTH = 2;
const LONGEST_TOKEN_MIN_LENGTH = 3;
const LOW_CONFIDENCE_THRESHOLD = 0.7;
const SHORT_TITLE_LENGTH = 4;

export function longestSearchToken(
  title: string,
  minLength = LONGEST_TOKEN_MIN_LENGTH,
): string | null {
  const tokens = title
    .split(/[\s\-_/]+/)
    .map((token) => token.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((token) => token.length >= minLength);

  if (tokens.length === 0) {
    return null;
  }

  return tokens.sort((a, b) => b.length - a.length)[0] ?? null;
}

export function collectSearchTermsForStage(stage: StageVision): string[] {
  const terms = new Set<string>();

  for (const candidate of stage.title_candidates) {
    const trimmed = candidate.title.trim();
    if (trimmed.length >= MIN_SEARCH_TERM_LENGTH) {
      terms.add(trimmed);
    }

    if (
      trimmed.length < SHORT_TITLE_LENGTH ||
      candidate.confidence < LOW_CONFIDENCE_THRESHOLD
    ) {
      const token = longestSearchToken(trimmed);
      if (token) {
        terms.add(token);
      }
    }
  }

  return [...terms];
}

export function collectAllSearchTerms(stages: StageVision[]): string[] {
  const terms = new Set<string>();

  for (const stage of stages) {
    for (const term of collectSearchTermsForStage(stage)) {
      terms.add(term);
    }
  }

  return [...terms];
}

export function toResolveCandidate(song: Song): ResolveCandidate {
  return {
    song_id: song.id,
    title: song.title,
    artist: song.artist,
    difficulty: song.difficulty,
    rating: song.rating,
  };
}

export function songMatchesSearchTerm(song: Song, term: string): boolean {
  const needle = term.toLowerCase();
  return (
    song.title.toLowerCase().includes(needle) ||
    song.artist.toLowerCase().includes(needle)
  );
}

export function groupCandidatesByStage(
  stages: StageVision[],
  songs: Song[],
): ResolveCandidate[][] {
  return stages.map((stage) => {
    const terms = collectSearchTermsForStage(stage);
    if (terms.length === 0) {
      return [];
    }

    const seen = new Set<number>();
    const candidates: ResolveCandidate[] = [];

    for (const song of songs) {
      if (seen.has(song.id)) {
        continue;
      }

      if (terms.some((term) => songMatchesSearchTerm(song, term))) {
        seen.add(song.id);
        candidates.push(toResolveCandidate(song));
      }
    }

    return candidates;
  });
}
