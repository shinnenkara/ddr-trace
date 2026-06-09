import type {
  DerivedStageContext,
  ResolveCandidate,
  StageVision,
} from "../ai-results-schema";
import { difficultyColorLegendForPrompt } from "../difficulty-colors";

export const RESOLVE_INTRO =
  "You are a DDR chart matching expert. Match each stage to exactly one song_id from that stage's database candidates.";

export const RESOLVE_RULES = `Rules:
- Pick song_id ONLY from the candidates list for each stage.
- Match title hypotheses and difficulty_color together when possible.
- difficulty_color comes from the selected player's grade panel border, not the grade letter.
- Strongly prefer candidates whose difficulty matches difficulty_color when border_confidence is high.
- If border_confidence is low, weight title more but still prefer difficulty match when title is ambiguous.
- difficulty_color maps to difficulty labels:
{{DIFFICULTY_LEGEND}}
- Preserve arcade_score from vision unless clearly wrong.
- Return resolve_confidence 0–1 per play reflecting match certainty.
- If no candidate fits well, still pick the closest and set low resolve_confidence with explanation in match_reason.
- Return one play per row in the same order as the input. Do not include stage numbers — order determines stage.`;

export const RESOLVE_OUTRO =
  "Return one play object per row with song_id, arcade_score, match_reason, and resolve_confidence.";

export const RESOLVE_STAGE_NO_CANDIDATES = "  (no candidates found)";
export const RESOLVE_STAGE_NO_TITLE_CANDIDATES = "    (none)";
export const RESOLVE_SESSION_MAJORITY_OVERRIDE = " (session majority override)";
export const RESOLVE_UNKNOWN = "unknown";
export const RESOLVE_BORDER_REASON_NONE = "(none)";

function resolveRulesBlock(): string {
  return RESOLVE_RULES.replace(
    "{{DIFFICULTY_LEGEND}}",
    difficultyColorLegendForPrompt(),
  );
}

function buildStageBlock(
  stage: StageVision,
  derived: DerivedStageContext | undefined,
  candidates: ResolveCandidate[],
): string {
  const titleLines = stage.title_candidates
    .map(
      (candidate) =>
        `    - "${candidate.title}" (confidence ${candidate.confidence.toFixed(2)}: ${candidate.short_reason})`,
    )
    .join("\n");

  const candidateLines =
    candidates.length > 0
      ? candidates
          .map(
            (candidate) =>
              `  - song_id=${candidate.song_id}, title="${candidate.title}", artist="${candidate.artist}", difficulty="${candidate.difficulty}", rating=${candidate.rating}`,
          )
          .join("\n")
      : RESOLVE_STAGE_NO_CANDIDATES;

  const sessionOverride = derived?.difficulty_overridden_by_session_majority
    ? RESOLVE_SESSION_MAJORITY_OVERRIDE
    : "";

  return `Stage ${stage.stage}:
  Vision title candidates:
${titleLines || RESOLVE_STAGE_NO_TITLE_CANDIDATES}
  selected_player: ${derived?.selected_player ?? RESOLVE_UNKNOWN}
  difficulty_color: ${derived?.difficulty_color ?? RESOLVE_UNKNOWN} (border_confidence ${(derived?.difficulty_border_confidence ?? 0).toFixed(2)})${sessionOverride}
  border_reason: ${derived?.difficulty_border_reason || RESOLVE_BORDER_REASON_NONE}
  arcade_score: ${derived?.score ?? RESOLVE_UNKNOWN}
Database candidates (already filtered to user's chart type):
${candidateLines}`;
}

export function buildResolvePrompt(
  stages: StageVision[],
  derivedContexts: DerivedStageContext[],
  candidatesByStage: ResolveCandidate[][],
  hint?: string | null,
): string {
  const stageBlocks = stages
    .map((stage, index) =>
      buildStageBlock(
        stage,
        derivedContexts[index],
        candidatesByStage[index] ?? [],
      ),
    )
    .join("\n\n");

  const hintLine = hint?.trim() ? `\nUser hint: ${hint.trim()}\n` : "";

  return `${RESOLVE_INTRO}

${resolveRulesBlock()}
${hintLine}
${stageBlocks}

${RESOLVE_OUTRO}`;
}
