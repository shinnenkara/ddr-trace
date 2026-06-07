import { describe, expect, it } from "vitest";
import { tryDeterministicResolve } from "./deterministic-resolve";
import type { ResolveCandidate, StageVision } from "./ai-results-schema";

describe("tryDeterministicResolve", () => {
  const stage: StageVision = {
    stage: 1,
    title_candidates: [
      {
        title: "PARANOiA",
        confidence: 0.95,
        short_reason: "clear",
      },
    ],
    score_layout: "single",
    left_score: null,
    right_score: null,
    arcade_score: 500000,
    score_confidence: 1,
    score_side: null,
    score_side_confidence: 1,
    score_selection_reason: "Single score column",
    difficulty_color: "red",
  };

  const candidates: ResolveCandidate[] = [
    {
      song_id: 10,
      title: "PARANOiA",
      artist: "180",
      difficulty: "Expert",
      rating: 10,
    },
    {
      song_id: 11,
      title: "PARANOiA",
      artist: "180",
      difficulty: "Basic",
      rating: 5,
    },
  ];

  it("resolves deterministically when one high-confidence title matches one difficulty row", () => {
    const result = tryDeterministicResolve([stage], [candidates]);

    expect(result.resolved).toHaveLength(1);
    expect(result.resolved[0].song_id).toBe(10);
    expect(result.ambiguousStages).toHaveLength(0);
  });

  it("defers to AI when multiple difficulty rows match", () => {
    const result = tryDeterministicResolve(
      [
        {
          ...stage,
          title_candidates: [
            {
              title: "PARANOiA",
              confidence: 0.95,
              short_reason: "clear",
            },
            {
              title: "PARANOIA",
              confidence: 0.5,
              short_reason: "alternate",
            },
          ],
        },
      ],
      [candidates],
    );

    expect(result.resolved).toHaveLength(0);
    expect(result.ambiguousStages).toHaveLength(1);
  });
});
