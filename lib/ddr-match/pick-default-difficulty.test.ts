import { describe, expect, it } from "vitest";
import {
  buildDifficultyOptions,
  pickDefaultVariant,
} from "./pick-default-difficulty";
import type { ResolveCandidate } from "./ai-results-schema";
import { makeDerivedStageContext } from "./test-helpers";

const variants: ResolveCandidate[] = [
  {
    song_id: 10,
    song_db_id: 1,
    title: "PARANOiA",
    artist: "180",
    difficulty: "Difficult",
    rating: 10,
  },
  {
    song_id: 11,
    song_db_id: 1,
    title: "PARANOiA",
    artist: "180",
    difficulty: "Basic",
    rating: 5,
  },
];

describe("pickDefaultVariant", () => {
  it("prefers difficulty matching vision border color", () => {
    const derived = makeDerivedStageContext({
      stage: 1,
      difficulty_color: "red",
      difficulty_border_confidence: 0.9,
    });

    const picked = pickDefaultVariant(variants, derived);

    expect(picked?.song_id).toBe(10);
    expect(picked?.difficulty).toBe("Difficult");
  });

  it("marks suggested difficulty in options", () => {
    const derived = makeDerivedStageContext({
      stage: 1,
      difficulty_color: "red",
      difficulty_border_confidence: 0.9,
    });

    const options = buildDifficultyOptions(variants, derived);

    expect(options.find((option) => option.songId === 10)?.suggested).toBe(
      true,
    );
    expect(options.find((option) => option.songId === 11)?.suggested).toBe(
      undefined,
    );
  });
});
