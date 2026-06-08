import { afterEach, describe, expect, it, vi } from "vitest";
import { logPhotoMatchTrace } from "./log-match-trace";
import {
  makeBorderCandidate,
  makeDerivedStageContext,
  makePlayerStats,
  makeStageVision,
} from "./test-helpers";

describe("logPhotoMatchTrace", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs raw p1/p2 borders and derived context side by side", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    logPhotoMatchTrace({
      playerSide: "auto",
      chartType: "single",
      screen: {
        played_player: "p1",
        played_player_confidence: 0.85,
        played_player_reason: "left column closer",
      },
      stages: [
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
            difficulty_border: [
              makeBorderCandidate({ color: "blue", confidence: 0.8 }),
            ],
          }),
        }),
      ],
      derivedContexts: [
        makeDerivedStageContext({
          stage: 1,
          selected_player: "p1",
          score: 802310,
          difficulty_color: "red",
          difficulty_border_confidence: 0.92,
          difficulty_border_reason: "strip right of B+",
          score_layout: "dual",
        }),
      ],
      resolved: {
        plays: [
          {
            song_id: 42,
            stage: 1,
            arcade_score: 802310,
            match_reason: "match",
            resolve_confidence: 0.9,
          },
        ],
      },
      candidatesByStage: [{ before: 4, after: 2 }],
      overallConfidence: 0.85,
      outcome: "preview",
    });

    expect(info).toHaveBeenCalledOnce();
    const payload = JSON.parse(String(info.mock.calls[0]?.[1])) as {
      stages: Array<{
        p1: { score: number; difficulty_border: Array<{ color: string }> } | null;
        derived: { selected_player: string } | null;
      }>;
      played_player: string;
    };
    expect(payload.played_player).toBe("p1");
    expect(payload.stages[0].p1?.score).toBe(802310);
    expect(payload.stages[0].p1?.difficulty_border[0].color).toBe("red");
    expect(payload.stages[0].derived?.selected_player).toBe("p1");
  });
});
