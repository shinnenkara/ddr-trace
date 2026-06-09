import type { DdrCapture } from "./ai-results-schema";
import { matchPhotoPlay } from "./match-photo-play";
import type { PhotoMatchOutcome } from "./photo-match-outcome";

/** @deprecated Use matchPhotoPlay directly — auto-log has been removed. */
export async function matchAndLogPlay(
  capture: DdrCapture,
): Promise<PhotoMatchOutcome> {
  return matchPhotoPlay(capture);
}
