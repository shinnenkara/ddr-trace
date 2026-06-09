import type {
  DdrVisionParseResult,
  PlayerColumnStats,
  SelectedPlayer,
  StageVision,
  TitleCandidate,
} from "../ai-results-schema";
import { deriveStageContexts } from "../derive-stage-context";
import type { DifficultyColor } from "../difficulty-colors";
import type { GoldenFixture, GoldenStage } from "./fixtures";
import { acceptableBorderColors } from "./fixtures";
import type { TitleMatcher } from "./match-title";

export type FieldScore = {
  pass: boolean;
  score: number;
  expected?: string | number | null;
  actual?: string | number | null;
};

export type StageScore = {
  stage: number;
  score: FieldScore;
  border: FieldScore;
  title: FieldScore & {
    bestCandidate?: string | null;
    similarity?: number;
    usedTieBreak?: boolean;
  };
  grade?: FieldScore;
};

export type DerivedStageScore = {
  stage: number;
  score: FieldScore;
  border: FieldScore;
};

export type FixtureEvalResult = {
  file: string;
  status: "success" | "error";
  error?: string;
  stageCount: { expected: number; actual: number; pass: boolean };
  stages: StageScore[];
  derived: DerivedStageScore[];
  weightedScore: number;
};

export type ConsistencyFieldStats = {
  score: number;
  border: number;
  title: number;
  runs: number;
};

const SCORE_WEIGHT = 0.5;
const BORDER_WEIGHT = 0.3;
const TITLE_WEIGHT = 0.2;

function getPlayerStats(
  stage: StageVision,
  player: SelectedPlayer,
): PlayerColumnStats | null {
  return player === "p1" ? (stage.p1 ?? null) : (stage.p2 ?? null);
}

function scoreExactField(
  expected: number | null,
  actual: number | null,
): FieldScore {
  const pass = expected === actual;
  return {
    pass,
    score: pass ? 1 : 0,
    expected,
    actual,
  };
}

function scoreBorderField(
  expectedColor: DifficultyColor,
  actualColor: DifficultyColor | null | undefined,
): FieldScore {
  const acceptable = acceptableBorderColors(expectedColor);
  const pass = actualColor !== null && actualColor !== undefined
    ? acceptable.includes(actualColor)
    : false;

  return {
    pass,
    score: pass ? 1 : 0,
    expected: acceptable.join("|"),
    actual: actualColor ?? null,
  };
}

function averageStageScore(stage: StageScore): number {
  return (
    stage.score.score * SCORE_WEIGHT +
    stage.border.score * BORDER_WEIGHT +
    stage.title.score * TITLE_WEIGHT
  );
}

export function computeWeightedScore(stages: StageScore[]): number {
  if (stages.length === 0) {
    return 0;
  }

  const total = stages.reduce((sum, stage) => sum + averageStageScore(stage), 0);
  return total / stages.length;
}

async function scoreStage(
  golden: GoldenStage,
  visionStage: StageVision | undefined,
  player: SelectedPlayer,
  matchTitle: TitleMatcher,
): Promise<StageScore> {
  const stats = visionStage ? getPlayerStats(visionStage, player) : null;
  const titleCandidates: TitleCandidate[] = visionStage?.title_candidates ?? [];
  const topBorder = stats?.difficulty_border[0]?.color ?? null;

  const titleResult = await matchTitle(golden.song_title, titleCandidates);

  return {
    stage: golden.stage,
    score: scoreExactField(golden.arcadeScore, stats?.score ?? null),
    border: scoreBorderField(golden.difficulty_color, topBorder),
    title: {
      pass: titleResult.pass,
      score: titleResult.score,
      expected: golden.song_title,
      actual: titleResult.bestCandidate,
      bestCandidate: titleResult.bestCandidate,
      similarity: titleResult.similarity,
      usedTieBreak: titleResult.usedTieBreak,
    },
    grade: {
      pass: stats?.grade === golden.rank,
      score: stats?.grade === golden.rank ? 1 : 0,
      expected: golden.rank,
      actual: stats?.grade ?? null,
    },
  };
}

export async function scoreVisionAgainstGolden(
  fixture: GoldenFixture,
  vision: DdrVisionParseResult,
  matchTitle: TitleMatcher,
): Promise<FixtureEvalResult> {
  if (vision.status !== "success") {
    return {
      file: fixture.file,
      status: "error",
      error: vision.error,
      stageCount: {
        expected: fixture.stages.length,
        actual: 0,
        pass: false,
      },
      stages: [],
      derived: [],
      weightedScore: 0,
    };
  }

  const stageCountPass = vision.stages.length === fixture.stages.length;

  const stages: StageScore[] = [];
  for (const goldenStage of fixture.stages) {
    const visionStage = vision.stages.find(
      (stage) => stage.stage === goldenStage.stage,
    );
    stages.push(
      await scoreStage(
        goldenStage,
        visionStage,
        fixture.player,
        matchTitle,
      ),
    );
  }

  const derivedContexts = deriveStageContexts(
    vision.stages,
    fixture.player_side,
    {
      played_player: vision.played_player,
      played_player_confidence: vision.played_player_confidence,
      played_player_reason: vision.played_player_reason,
    },
  );

  const derived: DerivedStageScore[] = fixture.stages.map((goldenStage) => {
    const context = derivedContexts.find(
      (item) => item.stage === goldenStage.stage,
    );

    return {
      stage: goldenStage.stage,
      score: scoreExactField(goldenStage.arcadeScore, context?.score ?? null),
      border: scoreBorderField(
        goldenStage.difficulty_color,
        context?.difficulty_color ?? null,
      ),
    };
  });

  const weightedScore = stageCountPass ? computeWeightedScore(stages) : 0;

  return {
    file: fixture.file,
    status: "success",
    stageCount: {
      expected: fixture.stages.length,
      actual: vision.stages.length,
      pass: stageCountPass,
    },
    stages,
    derived,
    weightedScore,
  };
}

export function summarizeConsistency(
  runs: FixtureEvalResult[],
): ConsistencyFieldStats {
  const successfulRuns = runs.filter((run) => run.status === "success");
  if (successfulRuns.length === 0) {
    return { score: 0, border: 0, title: 0, runs: runs.length };
  }

  let scorePasses = 0;
  let borderPasses = 0;
  let titlePasses = 0;
  let fieldCount = 0;

  for (const run of successfulRuns) {
    for (const stage of run.stages) {
      fieldCount++;
      if (stage.score.pass) scorePasses++;
      if (stage.border.pass) borderPasses++;
      if (stage.title.pass) titlePasses++;
    }
  }

  const denom = fieldCount || 1;

  return {
    score: scorePasses / denom,
    border: borderPasses / denom,
    title: titlePasses / denom,
    runs: runs.length,
  };
}
