import { or, like, eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { songs, songVariants } from "@/lib/db/schema";
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
  variantMatchesSearchTerm,
  toResolveCandidate,
} from "./search-term-utils";

const BULK_SEARCH_LIMIT = 100;

export async function searchSongsByTerms(
  terms: string[],
  chartType: ChartType,
) {
  if (terms.length === 0) {
    return [];
  }

  const db = await getDb();
  const patterns = terms.flatMap((term) => [
    like(songs.title, `%${term}%`),
    like(songs.artist, `%${term}%`),
  ]);

  const rows = await db
    .select({ variant: songVariants, song: songs })
    .from(songVariants)
    .innerJoin(songs, eq(songVariants.songId, songs.id))
    .where(and(eq(songVariants.type, chartType), or(...patterns)))
    .limit(BULK_SEARCH_LIMIT);

  return rows.map(({ variant, song }) => ({ ...variant, song }));
}

export async function searchCandidatesForVision(
  stages: StageVision[],
  chartType: ChartType,
): Promise<ResolveCandidate[][]> {
  const terms = collectAllSearchTerms(stages);
  const matchedVariants = await searchSongsByTerms(terms, chartType);
  return groupCandidatesByStage(stages, matchedVariants);
}
