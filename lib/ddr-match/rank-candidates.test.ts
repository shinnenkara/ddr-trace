import { describe, expect, it } from "vitest";
import {
  rankSongsForStage,
  resolveAmbiguousStagesHeuristic,
} from "./rank-candidates";
import type { ResolveCandidate } from "./ai-results-schema";
import { makeDerivedStageContext, makeStageVision } from "./test-helpers";

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
  {
    song_id: 20,
    song_db_id: 2,
    title: "Butterfly",
    artist: "Smile.dk",
    difficulty: "Difficult",
    rating: 8,
  },
];

describe("rankSongsForStage", () => {
  it("ranks exact title match highest", () => {
    const stage = makeStageVision({
      stage: 1,
      title_candidates: [
        { title: "PARANOiA", confidence: 0.95, short_reason: "clear" },
      ],
    });

    const ranked = rankSongsForStage(stage, candidates);

    expect(ranked[0].song_db_id).toBe(1);
    expect(ranked[0].matchScore).toBeGreaterThan(ranked[1].matchScore);
  });

  it("dedupes multiple difficulties of the same song", () => {
    const stage = makeStageVision({
      stage: 1,
      title_candidates: [
        { title: "PARANOiA", confidence: 0.95, short_reason: "clear" },
      ],
    });

    const ranked = rankSongsForStage(stage, candidates);

    expect(ranked).toHaveLength(2);
    expect(ranked[0].title).toBe("PARANOiA");
  });

  it("uses substring fragment for Japanese titles", () => {
    const stage = makeStageVision({
      stage: 3,
      title_candidates: [
        {
          title: "スイーツととまらない♪",
          confidence: 0.7,
          short_reason: "partial",
        },
        {
          title: "スイーツ",
          confidence: 0.9,
          short_reason: "confident fragment",
        },
      ],
    });
    const japaneseCandidates: ResolveCandidate[] = [
      {
        song_id: 30,
        song_db_id: 3,
        title: "スイーツととまらない♪",
        artist: "ひなぷす",
        difficulty: "Difficult",
        rating: 12,
      },
      {
        song_id: 31,
        song_db_id: 4,
        title: "Butterfly",
        artist: "Smile.dk",
        difficulty: "Difficult",
        rating: 8,
      },
    ];

    const ranked = rankSongsForStage(stage, japaneseCandidates);

    expect(ranked[0].song_db_id).toBe(3);
    expect(ranked[0].matchScore).toBeGreaterThan(ranked[1].matchScore);
  });

  it("considers multiple title hypotheses", () => {
    const stage = makeStageVision({
      stage: 1,
      title_candidates: [
        { title: "PARANOIA", confidence: 0.5, short_reason: "alternate" },
        { title: "PARANOiA", confidence: 0.95, short_reason: "clear" },
      ],
    });

    const ranked = rankSongsForStage(stage, candidates);

    expect(ranked[0].title).toBe("PARANOiA");
  });
});

describe("resolveAmbiguousStagesHeuristic", () => {
  it("picks top ranked song and default difficulty per stage", () => {
    const stage = makeStageVision({
      stage: 1,
      title_candidates: [
        { title: "PARANOiA", confidence: 0.95, short_reason: "clear" },
      ],
    });
    const derived = makeDerivedStageContext({
      stage: 1,
      score: 500000,
      difficulty_color: "red",
      difficulty_border_confidence: 0.95,
    });

    const plays = resolveAmbiguousStagesHeuristic(
      [stage],
      [derived],
      [candidates],
    );

    expect(plays).toHaveLength(1);
    expect(plays[0].song_id).toBe(10);
    expect(plays[0].arcade_score).toBe(500000);
    expect(plays[0].match_reason).toContain("Heuristic match");
  });
});
