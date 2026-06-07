import { describe, expect, it } from "vitest";
import type { Song } from "@/lib/db/schema";
import type { StageVision } from "./ai-results-schema";
import {
  collectAllSearchTerms,
  collectSearchTermsForStage,
  groupCandidatesByStage,
  longestSearchToken,
  songMatchesSearchTerm,
} from "./search-term-utils";

function makeSong(overrides: Partial<Song> & Pick<Song, "id" | "title">): Song {
  return {
    type: "single",
    folder: "folder",
    difficulty: "Expert",
    rating: 10,
    song_length: 90,
    display_bpm_min: 180,
    display_bpm_max: 180,
    bpm_changes: 0,
    artist: "Artist",
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
  const stage: StageVision = {
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
    score_layout: "single",
    left_score: null,
    right_score: null,
    arcade_score: 1000,
    score_confidence: 0.9,
    score_side: null,
    score_side_confidence: 1,
    score_selection_reason: "Single score column",
    difficulty_color: "red",
  };

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

  it("matches songs by title or artist", () => {
    const song = makeSong({
      id: 1,
      title: "PARANOiA EVOLUTION",
      artist: "180",
    });
    expect(songMatchesSearchTerm(song, "paranoia")).toBe(true);
    expect(songMatchesSearchTerm(song, "180")).toBe(true);
    expect(songMatchesSearchTerm(song, "missing")).toBe(false);
  });

  it("groups candidates per stage and dedupes by song id", () => {
    const songs = [
      makeSong({ id: 1, title: "PARANOiA", type: "single" }),
      makeSong({ id: 2, title: "PARANOiA EVOLUTION", type: "single" }),
      makeSong({ id: 1, title: "PARANOiA duplicate", type: "single" }),
    ];

    const grouped = groupCandidatesByStage([stage], songs);

    expect(grouped).toHaveLength(1);
    expect(grouped[0]).toHaveLength(2);
    expect(grouped[0].map((candidate) => candidate.song_id)).toEqual([1, 2]);
  });
});
