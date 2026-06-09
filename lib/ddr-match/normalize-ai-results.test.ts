import { describe, expect, it } from "vitest";
import {
  filterUsableStages,
  normalizeDdrVisionParse,
  normalizeDdrResolvedPlays,
  stageHasExtractableSignal,
} from "./normalize-ai-results";
import { VISION_ERROR_NOT_RESULTS } from "./vision-errors";
import { makeStageVision } from "./test-helpers";

describe("normalizeDdrVisionParse", () => {
  it("returns success for clear partial vision with multiple title candidates", () => {
    const result = normalizeDdrVisionParse({
      status: "success",
      looks_like_ddr_results: true,
      screen_confidence: 0.9,
      readability: "partial",
      stages: [
        {
          title_candidates: [
            {
              title: "PARANOiA",
              confidence: 0.55,
              short_reason: "partial: first 7 letters visible",
            },
            {
              title: "PARANOiA EVOLUTION",
              confidence: 0.45,
              short_reason: "possible subtitle visible",
            },
          ],
          p2: {
            score: 123456,
            difficulty_border: [
              {
                color: "red",
                confidence: 0.9,
                short_reason: "strip left of grade",
              },
            ],
          },
        },
      ],
    });

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.stages).toHaveLength(1);
      expect(result.stages[0].title_candidates).toHaveLength(2);
      expect(result.stages[0].title_candidates[0].title).toBe("PARANOiA");
      expect(result.stages[0].p2?.score).toBe(123456);
    }
  });

  it("returns transient error when readability is unreadable and no row data", () => {
    const result = normalizeDdrVisionParse({
      status: "success",
      looks_like_ddr_results: true,
      screen_confidence: 0.8,
      readability: "unreadable",
      stages: [],
    });

    expect(result).toEqual({
      status: "error",
      error: VISION_ERROR_NOT_RESULTS,
      error_kind: "content",
    });
  });

  it("salvages unreadable label when row data is present", () => {
    const result = normalizeDdrVisionParse({
      status: "error",
      error: "Too blurry",
      error_kind: "transient",
      readability: "unreadable",
      stages: [
        {
          title_candidates: [
            {
              title: "エイリアンエイリアン",
              confidence: 0.15,
              short_reason: "glare but legible",
            },
          ],
          p2: {
            score: 837760,
            difficulty_border: [
              {
                color: "yellow",
                confidence: 0.8,
                short_reason: "strip beside grade",
              },
            ],
          },
        },
      ],
    });

    expect(result.status).toBe("success");
  });

  it("accepts low-confidence titles when text is present", () => {
    const result = normalizeDdrVisionParse({
      status: "success",
      looks_like_ddr_results: true,
      screen_confidence: 0.9,
      readability: "partial",
      stages: [
        {
          title_candidates: [
            {
              title: "エイリアン",
              confidence: 0.12,
              short_reason: "glare",
            },
          ],
          p2: {
            score: 837760,
            difficulty_border: [
              {
                color: "yellow",
                confidence: 0.7,
                short_reason: "strip beside grade",
              },
            ],
          },
        },
      ],
    });

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.stages[0].p2?.score).toBe(837760);
    }
  });

  it("accepts partial crops with extractable rows even when screen confidence is low", () => {
    const result = normalizeDdrVisionParse({
      status: "success",
      looks_like_ddr_results: false,
      screen_confidence: 0.2,
      readability: "partial",
      stages: [
        {
          title_candidates: [
            {
              title: "Test Song",
              confidence: 0.95,
              short_reason: "clear",
            },
          ],
          p1: {
            score: 1000,
            difficulty_border: [
              {
                color: "blue",
                confidence: 0.9,
                short_reason: "strip beside grade",
              },
            ],
          },
        },
      ],
    });

    expect(result.status).toBe("success");
  });

  it("salvages row data when AI wrongly returns content error on a partial crop", () => {
    const result = normalizeDdrVisionParse({
      status: "error",
      error: "Not a full results screen",
      error_kind: "content",
      looks_like_ddr_results: false,
      stages: [
        {
          title_candidates: [
            {
              title: "Test Song",
              confidence: 0.9,
              short_reason: "visible in crop",
            },
          ],
          p1: {
            score: 50000,
            difficulty_border: [
              {
                color: "red",
                confidence: 0.8,
                short_reason: "strip beside grade",
              },
            ],
          },
        },
      ],
    });

    expect(result.status).toBe("success");
  });

  it("accepts score-only rows without title text", () => {
    const result = normalizeDdrVisionParse({
      status: "success",
      looks_like_ddr_results: true,
      screen_confidence: 0.9,
      readability: "partial",
      stages: [
        {
          title_candidates: [],
          p1: {
            score: 1000,
            difficulty_border: [
              {
                color: "blue",
                confidence: 0.9,
                short_reason: "strip beside grade",
              },
            ],
          },
        },
      ],
    });

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.stages[0].p1?.score).toBe(1000);
    }
  });

  it("clamps confidence values and dedupes title and border candidates", () => {
    const result = normalizeDdrVisionParse({
      status: "success",
      looks_like_ddr_results: true,
      screen_confidence: 1.5,
      readability: "clear",
      stages: [
        {
          title_candidates: [
            {
              title: "  Same Song  ",
              confidence: 2,
              short_reason: "clear",
            },
            {
              title: "same song",
              confidence: 0.5,
              short_reason: "duplicate",
            },
          ],
          p1: {
            score: 1000,
            difficulty_border: [
              {
                color: "red",
                confidence: 2,
                short_reason: "strip beside grade",
              },
              {
                color: "red",
                confidence: 0.5,
                short_reason: "duplicate color",
              },
              {
                color: "not-a-color",
                confidence: 0.9,
                short_reason: "invalid",
              },
            ],
          },
        },
      ],
    });

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.screen_confidence).toBe(1);
      expect(result.stages[0].title_candidates).toHaveLength(1);
      expect(result.stages[0].p1?.difficulty_border).toHaveLength(1);
      expect(result.stages[0].p1?.difficulty_border[0].confidence).toBe(1);
    }
  });

  it("normalizes nested p1/p2 stats without derived fields", () => {
    const result = normalizeDdrVisionParse({
      status: "success",
      looks_like_ddr_results: true,
      screen_confidence: 0.9,
      readability: "clear",
      stages: [
        {
          title_candidates: [
            { title: "Song", confidence: 0.9, short_reason: "clear" },
          ],
          p1: {
            score: 802310,
            difficulty_border: [
              {
                color: "red",
                confidence: 0.92,
                short_reason: "strip right of B+",
              },
            ],
          },
          p2: {
            score: 819510,
            difficulty_border: [
              {
                color: "blue",
                confidence: 0.85,
                short_reason: "strip left of A",
              },
            ],
          },
        },
      ],
    });

    expect(result.status).toBe("success");
    if (result.status === "success") {
      const row = result.stages[0];
      expect(row.p1?.score).toBe(802310);
      expect(row.p2?.score).toBe(819510);
      expect(row.p1?.difficulty_border[0].color).toBe("red");
      expect("selected_player" in row).toBe(false);
      expect("arcade_score" in row).toBe(false);
    }
  });

  it("parses played_player screen context", () => {
    const result = normalizeDdrVisionParse({
      status: "success",
      looks_like_ddr_results: true,
      screen_confidence: 0.9,
      readability: "clear",
      played_player: "p1",
      played_player_confidence: 0.4,
      played_player_reason: "uncertain",
      stages: [
        {
          title_candidates: [
            { title: "Song", confidence: 0.9, short_reason: "clear" },
          ],
          p1: { score: 100000 },
          p2: { score: 200000 },
        },
      ],
    });

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.played_player).toBe("p1");
      expect(result.played_player_confidence).toBe(0.4);
    }
  });

  it("keeps user-selected side row extractable without selected player score", () => {
    const result = normalizeDdrVisionParse({
      status: "success",
      looks_like_ddr_results: true,
      screen_confidence: 0.9,
      readability: "clear",
      stages: [
        {
          title_candidates: [
            { title: "Song", confidence: 0.9, short_reason: "clear" },
          ],
          p1: { score: null },
          p2: { score: 200000 },
        },
      ],
    });

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(stageHasExtractableSignal(result.stages[0])).toBe(true);
    }
  });

  it("assigns stage numbers from row order top to bottom", () => {
    const row = {
      title_candidates: [
        { title: "Song A", confidence: 0.95, short_reason: "clear" },
      ],
      p1: { score: 100000 },
    };

    const result = normalizeDdrVisionParse({
      status: "success",
      looks_like_ddr_results: true,
      screen_confidence: 0.9,
      readability: "clear",
      stages: [
        row,
        { ...row, p1: { score: 200000 } },
        { ...row, p1: { score: 300000 } },
      ],
    });

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.stages.map((stage) => stage.stage)).toEqual([1, 2, 3]);
    }
  });

  it("rejects non-positive song_id values", () => {
    expect(() =>
      normalizeDdrResolvedPlays({
        plays: [
          {
            song_id: -1,
            arcade_score: 100000,
            match_reason: "no candidates",
            resolve_confidence: 0.1,
          },
        ],
      }),
    ).toThrow("Resolved play has invalid song_id: -1");
  });

  it("assigns stage numbers from expectedStages when AI omits stage", () => {
    const result = normalizeDdrResolvedPlays(
      {
        plays: [
          {
            song_id: 42,
            arcade_score: 100000,
            match_reason: "title and difficulty match",
            resolve_confidence: 0.9,
          },
        ],
      },
      [makeStageVision({ stage: 2, title_candidates: [] })],
    );

    expect(result.plays[0].stage).toBe(2);
  });
});

describe("filterUsableStages", () => {
  it("includes rows with score or single-character title", () => {
    const stages = normalizeDdrVisionParse({
      status: "success",
      stages: [
        {
          title_candidates: [
            { title: "あ", confidence: 0.2, short_reason: "partial" },
          ],
          p2: {
            score: 500000,
            difficulty_border: [
              {
                color: "red",
                confidence: 0.9,
                short_reason: "strip beside grade",
              },
            ],
          },
        },
      ],
    });

    expect(stages.status).toBe("success");
    if (stages.status === "success") {
      expect(filterUsableStages(stages.stages)).toHaveLength(1);
    }
  });

  it("returns success when no extractable signals remain", () => {
    const result = normalizeDdrVisionParse({
      status: "success",
      stages: [
        {
          title_candidates: [],
        },
      ],
    });

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.stages).toHaveLength(1);
      expect(stageHasExtractableSignal(result.stages[0])).toBe(false);
      expect(filterUsableStages(result.stages)).toHaveLength(0);
    }
  });

  it("salvages blur error without row data to empty success", () => {
    const result = normalizeDdrVisionParse({
      status: "error",
      error: "Too blurry",
      error_kind: "transient",
      readability: "unreadable",
      stages: [],
    });

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.stages).toHaveLength(1);
      expect(filterUsableStages(result.stages)).toHaveLength(0);
    }
  });
});
