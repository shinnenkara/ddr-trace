import { or, eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { titleOrArtistContains } from "@/lib/db/column-contains";
import { songs, songVariants } from "@/lib/db/schema";
import type {
  ChartType,
  ResolveCandidate,
  StageVision,
} from "./ai-results-schema";
import {
  collectSearchTermsForStage,
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
  const patterns = terms.map((term) => titleOrArtistContains(term));

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
  return Promise.all(
    stages.map(async (stage) => {
      const terms = collectSearchTermsForStage(stage);
      if (terms.length === 0) {
        return [];
      }

      const matchedVariants = await searchSongsByTerms(terms, chartType);
      return groupCandidatesByStage([stage], matchedVariants)[0] ?? [];
    }),
  );
}
