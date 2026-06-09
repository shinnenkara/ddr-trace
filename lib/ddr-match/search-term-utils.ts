import type {
  SongCandidate,
  StageVision,
  ResolveCandidate,
} from "./ai-results-schema";
import type { SongVariantWithSong } from "@/lib/db/schema";

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

/** Maps a variant row to a resolve candidate; song_id is the variant id. */
export function toResolveCandidate(variant: SongVariantWithSong): ResolveCandidate {
  return {
    song_id: variant.id,
    song_db_id: variant.songId,
    title: variant.song.title,
    artist: variant.song.artist,
    difficulty: variant.difficulty,
    rating: variant.rating,
  };
}

export function dedupeCandidatesToSongs(
  candidates: ResolveCandidate[],
): SongCandidate[] {
  const seen = new Set<number>();
  const songs: SongCandidate[] = [];

  for (const candidate of candidates) {
    if (seen.has(candidate.song_db_id)) {
      continue;
    }
    seen.add(candidate.song_db_id);
    songs.push({
      song_db_id: candidate.song_db_id,
      title: candidate.title,
      artist: candidate.artist,
    });
  }

  return songs;
}

export function variantMatchesSearchTerm(
  variant: SongVariantWithSong,
  term: string,
): boolean {
  const needle = term.toLowerCase();
  return (
    variant.song.title.toLowerCase().includes(needle) ||
    variant.song.artist.toLowerCase().includes(needle)
  );
}

export function groupCandidatesByStage(
  stages: StageVision[],
  variants: SongVariantWithSong[],
): ResolveCandidate[][] {
  return stages.map((stage) => {
    const terms = collectSearchTermsForStage(stage);
    if (terms.length === 0) {
      return [];
    }

    const seen = new Set<number>();
    const candidates: ResolveCandidate[] = [];

    for (const variant of variants) {
      if (seen.has(variant.id)) {
        continue;
      }

      if (terms.some((term) => variantMatchesSearchTerm(variant, term))) {
        seen.add(variant.id);
        candidates.push(toResolveCandidate(variant));
      }
    }

    return candidates;
  });
}
