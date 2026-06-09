import { describe, expect, it } from "vitest";
import type { SongVariantWithSong } from "@/lib/db/schema";
import {
  collectAllSearchTerms,
  collectSearchTermsForStage,
  groupCandidatesByStage,
  longestSearchToken,
  variantMatchesSearchTerm,
} from "./search-term-utils";
import { makeStageVision } from "./test-helpers";

function makeVariant(
  overrides: Partial<SongVariantWithSong> &
    Pick<SongVariantWithSong, "id" | "song">,
): SongVariantWithSong {
  return {
    songId: 1,
    type: "single",
    difficulty: "Expert",
    rating: 10,
    notes: 0,
    steps: 0,
    jumps: 0,
    holds: 0,
    shock_arrows: 0,
    max_combo_steps_shock_arrows: 0,
    ...overrides,
  };
}

describe("search term utils", () => {
  const stage = makeStageVision({
    stage: 1,
    title_candidates: [
      {
        title: "PAR",
        confidence: 0.4,
        short_reason: "partial",
      },
      {
        title: "PARANOiA",
        confidence: 0.8,
        short_reason: "likely read",
      },
    ],
    p1: {
      score: 1000,
      difficulty_border: [
        {
          color: "red",
          confidence: 0.9,
          short_reason: "strip beside grade",
        },
      ],
    },
  });

  it("extracts longest token for short low-confidence titles", () => {
    expect(longestSearchToken("PA")).toBeNull();
    expect(longestSearchToken("PAR")).toBe("PAR");
    expect(longestSearchToken("PARANOiA EVOLUTION")).toBe("EVOLUTION");
  });

  it("collects unique search terms including token fallback", () => {
    expect(collectSearchTermsForStage(stage).sort()).toEqual([
      "PAR",
      "PARANOiA",
    ]);
    expect(collectAllSearchTerms([stage, stage]).sort()).toEqual([
      "PAR",
      "PARANOiA",
    ]);
  });

  it("matches variants by title or artist", () => {
    const variant = makeVariant({
      id: 1,
      song: {
        id: 1,
        folder: "folder",
        title: "PARANOiA EVOLUTION",
        artist: "180",
        song_length: 90,
        display_bpm_min: 180,
        display_bpm_max: 180,
        bpm_changes: 0,
      },
    });
    expect(variantMatchesSearchTerm(variant, "paranoia")).toBe(true);
    expect(variantMatchesSearchTerm(variant, "180")).toBe(true);
    expect(variantMatchesSearchTerm(variant, "missing")).toBe(false);
  });

  it("groups candidates per stage and dedupes by variant id", () => {
    const song1 = {
      id: 1,
      folder: "folder",
      title: "PARANOiA",
      artist: "Artist",
      song_length: 90,
      display_bpm_min: 180,
      display_bpm_max: 180,
      bpm_changes: 0,
    };
    const song2 = { ...song1, id: 2, title: "PARANOiA EVOLUTION" };

    const variants = [
      makeVariant({ id: 1, song: song1 }),
      makeVariant({ id: 2, song: song2 }),
      makeVariant({ id: 1, song: { ...song1, title: "PARANOiA duplicate" } }),
    ];

    const grouped = groupCandidatesByStage([stage], variants);

    expect(grouped).toHaveLength(1);
    expect(grouped[0]).toHaveLength(2);
    expect(grouped[0].map((candidate) => candidate.song_id)).toEqual([1, 2]);
  });
});
