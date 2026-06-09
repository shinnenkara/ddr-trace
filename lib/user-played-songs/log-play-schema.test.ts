import { describe, expect, it } from "vitest";
import { arcadeScoreSchema, logPlayManualSchema } from "./log-play-schema";
import { getChartObjectCount, MAX_ARCADE_SCORE } from "./chart-math";
import type { SongVariant } from "@/lib/db/schema";

const sampleVariant = {
  id: 1,
  songId: 1,
  type: "single" as const,
  difficulty: "Expert",
  rating: 15,
  notes: 500,
  steps: 400,
  jumps: 50,
  holds: 30,
  shock_arrows: 20,
  max_combo_steps_shock_arrows: 500,
} satisfies SongVariant;

describe("chart-math", () => {
  it("computes total object count", () => {
    expect(getChartObjectCount(sampleVariant)).toBe(500);
  });

  it("defines max arcade score", () => {
    expect(MAX_ARCADE_SCORE).toBe(1_000_000);
  });
});

describe("logPlayManualSchema", () => {
  it("accepts valid manual play input", () => {
    const parsed = logPlayManualSchema.parse({
      user_id: "user-1",
      song_id: "42",
      arcade_score: "950000",
      stage: "2",
      played_at: "2026-06-07T12:00:00.000Z",
    });

    expect(parsed.song_id).toBe(42);
    expect(parsed.arcade_score).toBe(950000);
    expect(parsed.stage).toBe(2);
  });

  it("rejects scores above max", () => {
    expect(() => arcadeScoreSchema.parse(MAX_ARCADE_SCORE + 1)).toThrow();
  });
});
