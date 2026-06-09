import { describe, expect, it } from "vitest";
import type { DdrVisionParseResult } from "../ai-results-schema";
import {
  makeBorderCandidate,
  makePlayerStats,
  makeStageVision,
} from "../test-helpers";
import {
  acceptableBorderColors,
  loadGoldenFixtures,
  normalizeBorderColor,
} from "./fixtures";
import { createExactTitleMatcher } from "./match-title";
import { diffVisionSnapshots } from "./snapshot-utils";
import {
  computeWeightedScore,
  scoreVisionAgainstGolden,
  summarizeConsistency,
} from "./score-vision";

const matchTitle = createExactTitleMatcher();

function successVision(stages: DdrVisionParseResult["stages"]): DdrVisionParseResult {
  return {
    status: "success",
    looks_like_ddr_results: true,
    screen_confidence: 0.9,
    readability: "clear",
    stages,
  };
}

describe("fixtures", () => {
  it("loads golden fixtures with normalized colors", () => {
    const fixtures = loadGoldenFixtures();
    expect(fixtures.length).toBe(4);
    expect(fixtures[0]?.stages[0]?.difficulty_color).toBe("yellow");
    expect(fixtures[0]?.player_side).toBe("left");
  });

  it("maps orange to yellow and accepts Basic border variants", () => {
    expect(normalizeBorderColor("orange")).toBe("yellow");
    expect(acceptableBorderColors("yellow")).toEqual(["yellow", "blue"]);
    expect(acceptableBorderColors("red")).toEqual(["red"]);
  });
});

describe("scoreVisionAgainstGolden", () => {
  const [fixture] = loadGoldenFixtures().filter((item) => item.file === "test_p1.jpeg");
  if (!fixture) {
    throw new Error("test_p1 fixture missing");
  }

  it("passes when all fields match on p1 column", async () => {
    const vision = successVision(
      fixture.stages.map((golden) =>
        makeStageVision({
          stage: golden.stage,
          title_candidates: [
            { title: golden.song_title, confidence: 0.9, short_reason: "clear" },
          ],
          p1: makePlayerStats({
            score: golden.arcadeScore,
            difficulty_border: [
              makeBorderCandidate({ color: golden.difficulty_color }),
            ],
            grade: golden.rank,
          }),
        }),
      ),
    );

    const result = await scoreVisionAgainstGolden(fixture, vision, matchTitle);
    expect(result.stageCount.pass).toBe(true);
    expect(result.weightedScore).toBe(1);
    expect(result.stages.every((stage) => stage.border.pass)).toBe(true);
    expect(result.derived.every((stage) => stage.score.pass)).toBe(true);
    expect(result.derived.every((stage) => stage.border.pass)).toBe(true);
  });

  it("fails stage count gate", async () => {
    const vision = successVision([
      makeStageVision({
        stage: 1,
        title_candidates: [{ title: "x", confidence: 0.5, short_reason: "x" }],
        p1: makePlayerStats({ score: 1 }),
      }),
    ]);

    const result = await scoreVisionAgainstGolden(fixture, vision, matchTitle);
    expect(result.stageCount.pass).toBe(false);
    expect(result.weightedScore).toBe(0);
  });

  it("scores p2 column for p2 fixtures", async () => {
    const p2Fixture = loadGoldenFixtures().find((item) => item.file === "test_p2.jpeg");
    if (!p2Fixture) {
      throw new Error("test_p2 fixture missing");
    }

    const golden = p2Fixture.stages[0];
    const vision = successVision([
      makeStageVision({
        stage: 1,
        title_candidates: [
          { title: golden.song_title, confidence: 0.9, short_reason: "clear" },
        ],
        p2: makePlayerStats({
          score: golden.arcadeScore,
          difficulty_border: [
            makeBorderCandidate({ color: golden.difficulty_color }),
          ],
          grade: golden.rank,
        }),
      }),
      makeStageVision({ stage: 2, title_candidates: [] }),
      makeStageVision({ stage: 3, title_candidates: [] }),
    ]);

    const result = await scoreVisionAgainstGolden(p2Fixture, vision, matchTitle);
    expect(result.stages[0]?.score.pass).toBe(true);
    expect(result.stages[0]?.border.pass).toBe(true);
  });

  it("accepts yellow or blue for Basic borders", async () => {
    const colorsFixture = loadGoldenFixtures().find(
      (item) => item.file === "test_p1_colors.jpeg",
    );
    if (!colorsFixture) {
      throw new Error("test_p1_colors fixture missing");
    }

    const golden = colorsFixture.stages[0];
    const vision = successVision([
      makeStageVision({
        stage: 1,
        title_candidates: [
          { title: golden.song_title, confidence: 0.9, short_reason: "clear" },
        ],
        p1: makePlayerStats({
          score: golden.arcadeScore,
          difficulty_border: [makeBorderCandidate({ color: "blue" })],
          grade: golden.rank,
        }),
      }),
      makeStageVision({ stage: 2, title_candidates: [] }),
      makeStageVision({ stage: 3, title_candidates: [] }),
    ]);

    const result = await scoreVisionAgainstGolden(
      colorsFixture,
      vision,
      matchTitle,
    );
    expect(result.stages[0]?.border.pass).toBe(true);
  });

  it("gives partial title credit for top-3 exact match", async () => {
    const golden = fixture.stages[0];
    const vision = successVision([
      makeStageVision({
        stage: 1,
        title_candidates: [
          { title: "wrong", confidence: 0.95, short_reason: "x" },
          { title: golden.song_title, confidence: 0.8, short_reason: "x" },
        ],
        p1: makePlayerStats({
          score: golden.arcadeScore,
          difficulty_border: [
            makeBorderCandidate({ color: golden.difficulty_color }),
          ],
        }),
      }),
      makeStageVision({ stage: 2, title_candidates: [] }),
      makeStageVision({ stage: 3, title_candidates: [] }),
    ]);

    const result = await scoreVisionAgainstGolden(fixture, vision, matchTitle);
    expect(result.stages[0]?.title.score).toBe(0.5);
  });
});

describe("computeWeightedScore", () => {
  it("weights score highest", () => {
    const weighted = computeWeightedScore([
      {
        stage: 1,
        score: { pass: false, score: 0 },
        border: { pass: true, score: 1 },
        title: { pass: true, score: 1 },
      },
    ]);
    expect(weighted).toBeCloseTo(0.5);
  });
});

describe("summarizeConsistency", () => {
  it("reports pass rates across runs", () => {
    const stats = summarizeConsistency([
      {
        file: "test_p1.jpeg",
        status: "success",
        stageCount: { expected: 1, actual: 1, pass: true },
        stages: [
          {
            stage: 1,
            score: { pass: true, score: 1 },
            border: { pass: false, score: 0 },
            title: { pass: true, score: 1 },
          },
        ],
        derived: [],
        weightedScore: 0.7,
      },
      {
        file: "test_p1.jpeg",
        status: "success",
        stageCount: { expected: 1, actual: 1, pass: true },
        stages: [
          {
            stage: 1,
            score: { pass: true, score: 1 },
            border: { pass: true, score: 1 },
            title: { pass: true, score: 1 },
          },
        ],
        derived: [],
        weightedScore: 1,
      },
    ]);

    expect(stats.runs).toBe(2);
    expect(stats.score).toBe(1);
    expect(stats.border).toBe(0.5);
    expect(stats.title).toBe(1);
  });
});

describe("diffVisionSnapshots", () => {
  it("detects stage-level changes", () => {
    const before = successVision([
      makeStageVision({
        stage: 1,
        title_candidates: [{ title: "A", confidence: 0.9, short_reason: "x" }],
        p1: makePlayerStats({ score: 100 }),
      }),
    ]);
    const after = successVision([
      makeStageVision({
        stage: 1,
        title_candidates: [{ title: "B", confidence: 0.9, short_reason: "x" }],
        p1: makePlayerStats({ score: 200 }),
      }),
    ]);

    const diffs = diffVisionSnapshots(before, after);
    expect(diffs.length).toBeGreaterThan(0);
    expect(diffs.join("\n")).toContain("title=");
  });
});
