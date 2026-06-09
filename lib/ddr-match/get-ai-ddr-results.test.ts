import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { resolvePlaysFromCandidates } from "./get-ai-ddr-results";
import { buildResolvePrompt } from "./prompts/resolve-prompt";
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

const resolveSource = readFileSync(
  join(promptsDir, "resolve-prompt.ts"),
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
});

describe("resolve prompt", () => {
  it("buildResolvePrompt uses derived context fields", () => {
    const prompt = buildResolvePrompt(
      [
        {
          stage: 1,
          title_candidates: [],
        },
      ],
      [
        {
          stage: 1,
          selected_player: "p1",
          difficulty_color: "green",
          difficulty_border_confidence: 0.9,
          difficulty_border_reason: "strip visible",
          score: 1_000_000,
          difficulty_overridden_by_session_majority: false,
        },
      ],
      [[]],
    );

    expect(prompt).toContain("border_reason:");
    expect(prompt).toContain("strip visible");
    expect(resolveSource).toContain("derivedContexts");
    expect(resolveSource).not.toContain("difficulty_color_alternates");
  });
});
