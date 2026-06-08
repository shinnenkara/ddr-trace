import { describe, expect, it } from "vitest";
import {
  deriveStageContexts,
  resolveSelectedPlayer,
} from "./derive-stage-context";
import {
  makeBorderCandidate,
  makeDerivedStageContext,
  makePlayerStats,
  makeStageVision,
} from "./test-helpers";
import { SESSION_MAJORITY_OVERRIDE_CONFIDENCE_CAP } from "./vision-errors";

describe("resolveSelectedPlayer", () => {
  const p1 = makePlayerStats({
    score: 802310,
    difficulty_border: [makeBorderCandidate({ color: "red" })],
  });
  const p2 = makePlayerStats({
    score: 819510,
    difficulty_border: [makeBorderCandidate({ color: "blue" })],
  });

  it("uses explicit left side", () => {
    expect(resolveSelectedPlayer("left", p1, p2)).toBe("p1");
  });

  it("uses explicit right side", () => {
    expect(resolveSelectedPlayer("right", p1, p2)).toBe("p2");
  });

  it("uses played_player in auto mode", () => {
    expect(
      resolveSelectedPlayer("auto", p1, p2, {
        played_player: "p2",
        played_player_confidence: 0.9,
      }),
    ).toBe("p2");
  });

  it("falls back to score-present column in auto mode", () => {
    expect(
      resolveSelectedPlayer("auto", makePlayerStats({ score: 100 }), null),
    ).toBe("p1");
  });
});

describe("deriveStageContexts", () => {
  it("derives score and primary border from selected player", () => {
    const stages = [
      makeStageVision({
        stage: 1,
        p1: makePlayerStats({
          score: 802310,
          difficulty_border: [
            makeBorderCandidate({
              color: "red",
              confidence: 0.92,
              short_reason: "strip right of B+",
            }),
          ],
        }),
        p2: makePlayerStats({
          score: 819510,
          difficulty_border: [makeBorderCandidate({ color: "blue" })],
        }),
      }),
    ];

    const [derived] = deriveStageContexts(stages, "left");

    expect(derived).toEqual(
      makeDerivedStageContext({
        stage: 1,
        selected_player: "p1",
        score: 802310,
        difficulty_color: "red",
        difficulty_border_confidence: 0.92,
        difficulty_border_reason: "strip right of B+",
        score_layout: "dual",
        score_side_confidence: 1,
      }),
    );
  });

  it("uses played_player confidence for dual auto layout", () => {
    const stages = [
      makeStageVision({
        stage: 1,
        p1: makePlayerStats({ score: 100 }),
        p2: makePlayerStats({ score: 200 }),
      }),
    ];

    const [derived] = deriveStageContexts(stages, "auto", {
      played_player: "p1",
      played_player_confidence: 0.4,
    });

    expect(derived.selected_player).toBe("p1");
    expect(derived.score_layout).toBe("dual");
    expect(derived.score_side_confidence).toBe(0.4);
  });

  it("overrides outlier difficulty with session majority vote", () => {
    const stages = [
      makeStageVision({
        stage: 1,
        p1: makePlayerStats({
          difficulty_border: [
            makeBorderCandidate({ color: "red", confidence: 0.9 }),
          ],
        }),
      }),
      makeStageVision({
        stage: 2,
        p1: makePlayerStats({
          difficulty_border: [
            makeBorderCandidate({ color: "red", confidence: 0.88 }),
          ],
        }),
      }),
      makeStageVision({
        stage: 3,
        p1: makePlayerStats({
          difficulty_border: [
            makeBorderCandidate({
              color: "green",
              confidence: 0.95,
              short_reason: "wrong element",
            }),
          ],
        }),
      }),
    ];

    const derived = deriveStageContexts(stages, "left");

    expect(derived[2].difficulty_color).toBe("red");
    expect(derived[2].difficulty_overridden_by_session_majority).toBe(true);
    expect(derived[2].difficulty_border_confidence).toBe(
      SESSION_MAJORITY_OVERRIDE_CONFIDENCE_CAP,
    );
  });

  it("does not override when no majority of 2+", () => {
    const stages = [
      makeStageVision({
        stage: 1,
        p1: makePlayerStats({
          difficulty_border: [makeBorderCandidate({ color: "red" })],
        }),
      }),
      makeStageVision({
        stage: 2,
        p1: makePlayerStats({
          difficulty_border: [makeBorderCandidate({ color: "green" })],
        }),
      }),
      makeStageVision({
        stage: 3,
        p1: makePlayerStats({
          difficulty_border: [makeBorderCandidate({ color: "blue" })],
        }),
      }),
    ];

    const derived = deriveStageContexts(stages, "left");

    expect(derived.map((context) => context.difficulty_color)).toEqual([
      "red",
      "green",
      "blue",
    ]);
    expect(
      derived.some(
        (context) => context.difficulty_overridden_by_session_majority,
      ),
    ).toBe(false);
  });
});
