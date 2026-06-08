import { describe, expect, it } from "vitest";
import { filterCandidatesByDifficulty } from "./filter-candidates-by-difficulty";
import { makeDerivedStageContext } from "./test-helpers";

describe("filterCandidatesByDifficulty", () => {
  const candidates = [
    {
      song_id: 1,
      title: "Song",
      artist: "A",
      difficulty: "Difficult",
      rating: 9,
    },
    {
      song_id: 2,
      title: "Song",
      artist: "A",
      difficulty: "Basic",
      rating: 5,
    },
  ];

  it("filters to matching difficulty when color is set", () => {
    const derived = [
      makeDerivedStageContext({ stage: 1, difficulty_color: "red" }),
    ];
    const result = filterCandidatesByDifficulty(derived, [candidates]);
    expect(result[0]).toHaveLength(1);
    expect(result[0][0].difficulty).toBe("Difficult");
  });

  it("falls back to all candidates when filter would empty the list", () => {
    const derived = [
      makeDerivedStageContext({ stage: 1, difficulty_color: "purple" }),
    ];
    const result = filterCandidatesByDifficulty(derived, [candidates]);
    expect(result[0]).toHaveLength(2);
  });
});
