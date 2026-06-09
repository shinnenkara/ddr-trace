import { describe, expect, it } from "vitest";
import { tryDeterministicResolve } from "./deterministic-resolve";
import type { ResolveCandidate } from "./ai-results-schema";
import { makeDerivedStageContext, makeStageVision } from "./test-helpers";

describe("tryDeterministicResolve", () => {
  const stage = makeStageVision({
    stage: 1,
    title_candidates: [
      {
        title: "PARANOiA",
        confidence: 0.95,
        short_reason: "clear",
      },
    ],
  });

  const derived = makeDerivedStageContext({
    stage: 1,
    score: 500000,
    difficulty_color: "red",
    difficulty_border_confidence: 0.95,
  });

  const candidates: ResolveCandidate[] = [
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

  it("resolves deterministically when one song matches with default difficulty", () => {
    const result = tryDeterministicResolve([stage], [derived], [candidates]);

    expect(result.resolved).toHaveLength(1);
    expect(result.resolved[0].song_id).toBe(10);
    expect(result.ambiguousStages).toHaveLength(0);
  });

  it("defers to ranking when multiple title hypotheses exist", () => {
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
      [derived],
      [candidates],
    );

    expect(result.resolved).toHaveLength(0);
    expect(result.ambiguousStages).toHaveLength(1);
    expect(result.ambiguousDerived).toHaveLength(1);
  });
});
