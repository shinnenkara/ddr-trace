import { describe, expect, it } from "vitest";
import {
  arcadeScoreSchema,
  logPlayManualSchema,
} from "./log-play-schema";
import { getChartObjectCount, MAX_ARCADE_SCORE } from "./chart-math";
import type { Song } from "@/lib/db/schema";

const sampleSong = {
  id: 1,
  type: "single" as const,
  folder: "A20",
  title: "Test",
  difficulty: "Expert",
  rating: 15,
  song_length: 120,
  display_bpm_min: 150,
  display_bpm_max: 150,
  bpm_changes: 0,
  artist: "Artist",
  notes: 500,
  steps: 400,
  jumps: 50,
  holds: 30,
  shock_arrows: 20,
  max_combo_steps_shock_arrows: 500,
} satisfies Song;

describe("chart-math", () => {
  it("computes total object count", () => {
    expect(getChartObjectCount(sampleSong)).toBe(500);
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
    expect(() =>
      arcadeScoreSchema.parse(MAX_ARCADE_SCORE + 1),
    ).toThrow();
  });
});
