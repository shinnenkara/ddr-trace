import { or, like, eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { songs } from "@/lib/db/schema";
import type {
  ChartType,
  ResolveCandidate,
  StageVision,
} from "./ai-results-schema";
import {
  collectAllSearchTerms,
  groupCandidatesByStage,
} from "./search-term-utils";

export {
  collectSearchTermsForStage,
  collectAllSearchTerms,
  groupCandidatesByStage,
  longestSearchToken,
  songMatchesSearchTerm,
  toResolveCandidate,
} from "./search-term-utils";

const BULK_SEARCH_LIMIT = 100;

export async function searchSongsByTerms(
  terms: string[],
  chartType: ChartType,
): Promise<(typeof songs.$inferSelect)[]> {
  if (terms.length === 0) {
    return [];
  }

  const db = await getDb();
  const patterns = terms.flatMap((term) => [
    like(songs.title, `%${term}%`),
    like(songs.artist, `%${term}%`),
  ]);

  return db
    .select()
    .from(songs)
    .where(and(eq(songs.type, chartType), or(...patterns)))
    .limit(BULK_SEARCH_LIMIT);
}

export async function searchCandidatesForVision(
  stages: StageVision[],
  chartType: ChartType,
): Promise<ResolveCandidate[][]> {
  const terms = collectAllSearchTerms(stages);
  const matchedSongs = await searchSongsByTerms(terms, chartType);
  return groupCandidatesByStage(stages, matchedSongs);
}
