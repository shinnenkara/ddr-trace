export const VISION_ERROR_NOT_RESULTS =
  "This doesn't look like a DDR results screen.";

export const VISION_ERROR_PICK_PLAYER_SIDE =
  "Two player scores detected — select 1P or 2P and retry.";

export const VISION_ERROR_SIDE_SCORE_UNREADABLE =
  "Could not read the score for the selected player side. Retake or try Auto.";

export function visionErrorNoSongCandidatesForStage(stage: number): string {
  return `Couldn't match the song for stage ${stage} — the title may be misread. Retake or add a hint.`;
}

export const MIN_TITLE_CANDIDATE_CONFIDENCE = 0.25;
export const MIN_RESOLVE_CONFIDENCE = 0.6;
export const MIN_SCORE_SIDE_CONFIDENCE = 0.6;
export const HIGH_TITLE_CONFIDENCE = 0.85;
export const MAX_TITLE_CANDIDATES_PER_STAGE = 10;
export const MAX_BORDER_CANDIDATES_PER_PLAYER = 3;
export const SESSION_MAJORITY_OVERRIDE_CONFIDENCE_CAP = 0.5;
