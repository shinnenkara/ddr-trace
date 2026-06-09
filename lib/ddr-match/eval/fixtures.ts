import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ChartType, PlayerSide, SelectedPlayer } from "../ai-results-schema";
import type { DifficultyColor } from "../difficulty-colors";
import { DIFFICULTY_COLORS } from "../difficulty-colors";

export type GoldenStage = {
  stage: number;
  song_title: string;
  difficulty_color: DifficultyColor;
  difficulty: string;
  arcadeScore: number;
  rank: string;
};

export type GoldenFixture = {
  file: string;
  player: SelectedPlayer;
  player_side: PlayerSide;
  chart_type: ChartType;
  stages: GoldenStage[];
};

type RawGoldenFixture = {
  file: string;
  player: SelectedPlayer;
  player_side?: PlayerSide;
  chart_type?: ChartType;
  stages: Array<{
    stage: number;
    song_title: string;
    difficulty_color: string;
    difficulty: string;
    arcadeScore: number;
    rank: string;
  }>;
};

const BASIC_BORDER_COLORS: DifficultyColor[] = ["yellow", "blue"];

export function normalizeBorderColor(raw: string): DifficultyColor {
  const key = raw.toLowerCase().trim();

  if (key === "orange") {
    return "yellow";
  }

  if ((DIFFICULTY_COLORS as readonly string[]).includes(key)) {
    return key as DifficultyColor;
  }

  throw new Error(`Unknown difficulty color in fixture: ${raw}`);
}

export function acceptableBorderColors(color: DifficultyColor): DifficultyColor[] {
  if (BASIC_BORDER_COLORS.includes(color)) {
    return BASIC_BORDER_COLORS;
  }
  return [color];
}

function normalizeFixture(raw: RawGoldenFixture): GoldenFixture {
  const playerSide =
    raw.player_side ??
    (raw.player === "p1" ? "left" : raw.player === "p2" ? "right" : "auto");

  return {
    file: raw.file,
    player: raw.player,
    player_side: playerSide,
    chart_type: raw.chart_type ?? "single",
    stages: raw.stages.map((stage) => ({
      ...stage,
      difficulty_color: normalizeBorderColor(stage.difficulty_color),
    })),
  };
}

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "test",
);

export function getFixturesPath(): string {
  return join(fixturesDir, "mock_results.json");
}

export function loadGoldenFixtures(): GoldenFixture[] {
  const raw = JSON.parse(
    readFileSync(getFixturesPath(), "utf8"),
  ) as RawGoldenFixture[];

  return raw.map(normalizeFixture);
}

export function getFixtureImagePath(fixture: GoldenFixture): string {
  return join(fixturesDir, fixture.file);
}

export function filterFixtures(
  fixtures: GoldenFixture[],
  namePrefix?: string,
): GoldenFixture[] {
  if (!namePrefix?.trim()) {
    return fixtures;
  }

  const needle = namePrefix.trim().toLowerCase();
  return fixtures.filter((fixture) =>
    fixture.file.toLowerCase().includes(needle),
  );
}
