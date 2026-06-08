import type { DifficultyColor } from "./difficulty-colors";
import type {
  DerivedStageContext,
  PlayerColumnStats,
  PlayerSide,
  ScoreLayout,
  SelectedPlayer,
  StageVision,
  VisionScreenContext,
} from "./ai-results-schema";
import { SESSION_MAJORITY_OVERRIDE_CONFIDENCE_CAP } from "./vision-errors";

function playerHasSignal(stats: PlayerColumnStats | null | undefined): boolean {
  if (!stats) {
    return false;
  }
  return stats.score !== null || stats.difficulty_border.length > 0;
}

function inferScoreLayout(
  p1: PlayerColumnStats | null | undefined,
  p2: PlayerColumnStats | null | undefined,
): ScoreLayout {
  const p1Score = p1?.score ?? null;
  const p2Score = p2?.score ?? null;
  if (p1Score !== null && p2Score !== null) {
    return "dual";
  }
  return "single";
}

export function resolveSelectedPlayer(
  playerSide: PlayerSide,
  p1: PlayerColumnStats | null | undefined,
  p2: PlayerColumnStats | null | undefined,
  screen: VisionScreenContext = {},
): SelectedPlayer {
  if (playerSide === "left") {
    return "p1";
  }
  if (playerSide === "right") {
    return "p2";
  }

  if (screen.played_player === "p1" || screen.played_player === "p2") {
    return screen.played_player;
  }

  const p1Score = p1?.score ?? null;
  const p2Score = p2?.score ?? null;

  if (p1Score !== null && p2Score === null) {
    return "p1";
  }
  if (p2Score !== null && p1Score === null) {
    return "p2";
  }

  if (playerHasSignal(p1) && !playerHasSignal(p2)) {
    return "p1";
  }
  if (playerHasSignal(p2) && !playerHasSignal(p1)) {
    return "p2";
  }

  return "p1";
}

function getSelectedPlayerStats(
  selectedPlayer: SelectedPlayer,
  p1: PlayerColumnStats | null | undefined,
  p2: PlayerColumnStats | null | undefined,
): PlayerColumnStats | null {
  return selectedPlayer === "p1" ? (p1 ?? null) : (p2 ?? null);
}

function deriveScoreSideConfidence(
  playerSide: PlayerSide,
  selectedPlayer: SelectedPlayer,
  selectedStats: PlayerColumnStats | null,
  scoreLayout: ScoreLayout,
  screen: VisionScreenContext = {},
): number {
  const hasScore = selectedStats?.score !== null;

  if (playerSide === "left" || playerSide === "right") {
    return hasScore ? 1 : 0;
  }

  if (scoreLayout !== "dual") {
    return hasScore ? 1 : 0;
  }

  const playedConfidence = screen.played_player_confidence;
  if (
    playedConfidence !== undefined &&
    screen.played_player === selectedPlayer
  ) {
    return hasScore ? playedConfidence : 0;
  }

  return hasScore ? 0.5 : 0;
}

function deriveSingleStageContext(
  stage: StageVision,
  playerSide: PlayerSide,
  screen: VisionScreenContext,
): DerivedStageContext {
  const selectedPlayer = resolveSelectedPlayer(
    playerSide,
    stage.p1,
    stage.p2,
    screen,
  );
  const selectedStats = getSelectedPlayerStats(
    selectedPlayer,
    stage.p1,
    stage.p2,
  );
  const scoreLayout = inferScoreLayout(stage.p1, stage.p2);
  const topBorder = selectedStats?.difficulty_border[0];

  return {
    stage: stage.stage,
    selected_player: selectedPlayer,
    score: selectedStats?.score ?? null,
    difficulty_color: topBorder?.color ?? null,
    difficulty_border_confidence: topBorder?.confidence ?? 0,
    difficulty_border_reason: topBorder?.short_reason ?? "",
    score_layout: scoreLayout,
    score_side_confidence: deriveScoreSideConfidence(
      playerSide,
      selectedPlayer,
      selectedStats,
      scoreLayout,
      screen,
    ),
  };
}

function applySessionMajorityVote(
  contexts: DerivedStageContext[],
): DerivedStageContext[] {
  const colorCounts = new Map<DifficultyColor, number>();

  for (const context of contexts) {
    if (context.difficulty_color) {
      colorCounts.set(
        context.difficulty_color,
        (colorCounts.get(context.difficulty_color) ?? 0) + 1,
      );
    }
  }

  if (colorCounts.size === 0) {
    return contexts;
  }

  let majorityColor: DifficultyColor | null = null;
  let majorityCount = 0;

  for (const [color, count] of colorCounts) {
    if (count > majorityCount) {
      majorityColor = color;
      majorityCount = count;
    }
  }

  if (!majorityColor || majorityCount < 2) {
    return contexts;
  }

  return contexts.map((context) => {
    if (
      !context.difficulty_color ||
      context.difficulty_color === majorityColor
    ) {
      return context;
    }

    return {
      ...context,
      difficulty_color: majorityColor,
      difficulty_border_confidence: Math.min(
        context.difficulty_border_confidence,
        SESSION_MAJORITY_OVERRIDE_CONFIDENCE_CAP,
      ),
      difficulty_overridden_by_session_majority: true,
    };
  });
}

export function deriveStageContexts(
  stages: StageVision[],
  playerSide: PlayerSide,
  screen: VisionScreenContext = {},
): DerivedStageContext[] {
  const contexts = stages.map((stage) =>
    deriveSingleStageContext(stage, playerSide, screen),
  );
  return applySessionMajorityVote(contexts);
}

export function getDerivedContextForStage(
  contexts: DerivedStageContext[],
  stageNumber: number,
): DerivedStageContext | undefined {
  return contexts.find((context) => context.stage === stageNumber);
}
