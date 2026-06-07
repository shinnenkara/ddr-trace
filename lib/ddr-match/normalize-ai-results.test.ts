import { describe, expect, it } from "vitest";
import {
  filterUsableStages,
  normalizeDdrVisionParse,
  normalizeDdrResolvedPlays,
  stageHasExtractableSignal,
} from "./normalize-ai-results";
import {
  VISION_ERROR_NOT_RESULTS,
  VISION_ERROR_TOO_BLURRY,
} from "./vision-errors";

const dualStageBase = {
  stage: 1,
  title_candidates: [
    {
      title: "Test Song",
      confidence: 0.95,
      short_reason: "clear",
    },
  ],
  score_layout: "dual" as const,
  left_score: 100000,
  right_score: 200000,
  score_confidence: 0.9,
  difficulty_color: "blue",
};

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
          arcade_score: 123456,
          score_confidence: 0.9,
          difficulty_color: "red",
        },
      ],
    });

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.stages).toHaveLength(1);
      expect(result.stages[0].title_candidates).toHaveLength(2);
      expect(result.stages[0].title_candidates[0].title).toBe("PARANOiA");
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
          right_score: 837760,
          arcade_score: 837760,
          score_confidence: 0.9,
          difficulty_color: "yellow",
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
          right_score: 837760,
          score_confidence: 0.9,
          difficulty_color: "yellow",
        },
      ],
    });

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.stages[0].arcade_score).toBe(837760);
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
          arcade_score: 1000,
          score_confidence: 1,
          difficulty_color: "blue",
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
          arcade_score: 50000,
          score_confidence: 0.8,
          difficulty_color: "red",
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
          arcade_score: 1000,
          score_confidence: 0.9,
          difficulty_color: "blue",
        },
      ],
    });

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.stages[0].arcade_score).toBe(1000);
    }
  });

  it("clamps confidence values and dedupes title candidates", () => {
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
          arcade_score: 1000,
          score_confidence: -1,
          difficulty_color: "not-a-color",
        },
      ],
    });

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.screen_confidence).toBe(1);
      expect(result.stages[0].title_candidates).toHaveLength(1);
      expect(result.stages[0].score_confidence).toBe(0);
      expect(result.stages[0].difficulty_color).toBeNull();
    }
  });

  it("normalizes dual scores and applies user left side override", () => {
    const result = normalizeDdrVisionParse(
      {
        status: "success",
        looks_like_ddr_results: true,
        screen_confidence: 0.9,
        readability: "clear",
        stages: [
          {
            ...dualStageBase,
            arcade_score: 200000,
            score_side: "right",
            score_side_confidence: 0.7,
            score_selection_reason: "right column closer",
          },
        ],
      },
      "left",
    );

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.stages[0].score_layout).toBe("dual");
      expect(result.stages[0].left_score).toBe(100000);
      expect(result.stages[0].right_score).toBe(200000);
      expect(result.stages[0].arcade_score).toBe(100000);
      expect(result.stages[0].score_side).toBe("left");
      expect(result.stages[0].score_side_confidence).toBe(1);
    }
  });

  it("keeps auto dual score side with low confidence for preview routing", () => {
    const result = normalizeDdrVisionParse(
      {
        status: "success",
        looks_like_ddr_results: true,
        screen_confidence: 0.9,
        readability: "clear",
        stages: [
          {
            ...dualStageBase,
            arcade_score: 100000,
            score_side: "left",
            score_side_confidence: 0.4,
            score_selection_reason: "uncertain",
          },
        ],
      },
      "auto",
    );

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.stages[0].score_side_confidence).toBe(0.4);
    }
  });

  it("keeps user-selected side with unreadable score as extractable row", () => {
    const result = normalizeDdrVisionParse(
      {
        status: "success",
        looks_like_ddr_results: true,
        screen_confidence: 0.9,
        readability: "clear",
        stages: [
          {
            ...dualStageBase,
            left_score: null,
            arcade_score: 200000,
            score_side: "right",
            score_side_confidence: 1,
            score_selection_reason: "user specified right",
          },
        ],
      },
      "left",
    );

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.stages[0].arcade_score).toBeNull();
      expect(stageHasExtractableSignal(result.stages[0])).toBe(true);
    }
  });

  it("assigns stage numbers from row order top to bottom", () => {
    const row = {
      title_candidates: [
        { title: "Song A", confidence: 0.95, short_reason: "clear" },
      ],
      arcade_score: 100000,
      score_confidence: 1,
      difficulty_color: "blue",
    };

    const result = normalizeDdrVisionParse({
      status: "success",
      looks_like_ddr_results: true,
      screen_confidence: 0.9,
      readability: "clear",
      stages: [row, { ...row, arcade_score: 200000 }, { ...row, arcade_score: 300000 }],
    });

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.stages.map((stage) => stage.stage)).toEqual([1, 2, 3]);
    }
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
      [
        {
          stage: 2,
          title_candidates: [
            { title: "Test Song", confidence: 0.9, short_reason: "clear" },
          ],
          score_layout: "single",
          left_score: null,
          right_score: null,
          arcade_score: 100000,
          score_confidence: 1,
          score_side: null,
          score_side_confidence: 1,
          score_selection_reason: "single",
          difficulty_color: "red",
        },
      ],
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
          title_candidates: [{ title: "あ", confidence: 0.2, short_reason: "partial" }],
          right_score: 500000,
          score_confidence: 0.9,
          difficulty_color: "red",
        },
      ],
    });

    expect(stages.status).toBe("success");
    if (stages.status === "success") {
      expect(filterUsableStages(stages.stages)).toHaveLength(1);
    }
  });

  it("returns transient error only when no extractable signals remain", () => {
    const result = normalizeDdrVisionParse({
      status: "success",
      stages: [
        {
          title_candidates: [],
          difficulty_color: undefined,
        },
      ],
    });

    expect(result).toEqual({
      status: "error",
      error: VISION_ERROR_TOO_BLURRY,
      error_kind: "transient",
    });
  });
});
