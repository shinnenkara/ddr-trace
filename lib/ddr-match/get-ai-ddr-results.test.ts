import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { resolvePlaysFromCandidates } from "./get-ai-ddr-results";
import {
  buildVisionSystemPrompt,
  buildVisionUserMessageText,
} from "./prompts/vision-prompt";
import {
  makeDerivedStageContext,
  makeStageVision,
} from "./test-helpers";
import { visionErrorNoSongCandidatesForStage } from "./vision-errors";

const promptsDir = join(dirname(fileURLToPath(import.meta.url)), "prompts");

const visionSource = readFileSync(
  join(promptsDir, "vision-prompt.ts"),
  "utf8",
);

describe("vision prompt", () => {
  it("asks for difficulty_border hypotheses with short_reason", () => {
    const prompt = buildVisionSystemPrompt();
    expect(prompt).toContain("difficulty_border");
    expect(prompt).toContain("short_reason");
    expect(visionSource).not.toContain("difficulty_border_color_alternates");
    expect(visionSource).not.toContain("score_confidence");
  });

  it("asks for multiple title_candidates with fragments for non-Latin titles", () => {
    const prompt = buildVisionSystemPrompt();
    expect(prompt).toContain("title_candidates");
    expect(prompt).toContain("non-Latin");
    expect(prompt).toContain("substring fragment");
    expect(prompt).toContain("visually similar characters");
  });

  it("keeps capture context on the user message only", () => {
    const system = buildVisionSystemPrompt();
    const user = buildVisionUserMessageText({
      playerSide: "left",
      hint: "cropped top row",
    });

    expect(system).not.toContain("User player side:");
    expect(system).not.toContain("User hint:");
    expect(user).toContain("User player side: left (1P)");
    expect(user).toContain("User hint: cropped top row");
  });
});

describe("resolvePlaysFromCandidates", () => {
  it("fails cleanly when an ambiguous stage has no database candidates", async () => {
    const stage = makeStageVision({
      stage: 3,
      title_candidates: [
        {
          title: "スイーツととまらない♪",
          confidence: 0.95,
          short_reason: "full title visible",
        },
        {
          title: "スイーツ",
          confidence: 0.9,
          short_reason: "confident fragment",
        },
      ],
      p2: {
        score: 871840,
        difficulty_border: [
          {
            color: "red",
            confidence: 0.95,
            short_reason: "red strip beside grade",
          },
        ],
      },
    });

    await expect(
      resolvePlaysFromCandidates(
        [stage],
        [
          makeDerivedStageContext({
            stage: 3,
            selected_player: "p2",
            score: 871840,
            difficulty_color: "red",
            difficulty_border_confidence: 0.95,
            difficulty_border_reason: "red strip beside grade",
          }),
        ],
        [[]],
      ),
    ).rejects.toThrow(visionErrorNoSongCandidatesForStage(3));
  });

  it("resolves ambiguous stages with heuristic ranking", async () => {
    const stage = makeStageVision({
      stage: 1,
      title_candidates: [
        { title: "PARANOiA", confidence: 0.7, short_reason: "partial" },
        { title: "PARANOIA", confidence: 0.5, short_reason: "alternate" },
      ],
      p1: {
        score: 500000,
        difficulty_border: [
          {
            color: "red",
            confidence: 0.9,
            short_reason: "red strip",
          },
        ],
      },
    });

    const result = await resolvePlaysFromCandidates(
      [stage],
      [
        makeDerivedStageContext({
          stage: 1,
          selected_player: "p1",
          score: 500000,
          difficulty_color: "red",
          difficulty_border_confidence: 0.9,
        }),
      ],
      [
        [
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
        ],
      ],
    );

    expect(result.plays).toHaveLength(1);
    expect(result.plays[0].song_id).toBe(10);
    expect(result.rankedSongsByStage[0]).toHaveLength(1);
    expect(result.rankedSongsByStage[0][0].song_db_id).toBe(1);
  });
});
