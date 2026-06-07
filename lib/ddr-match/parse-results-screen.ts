import type { DdrCapture } from "./ai-results-schema";
import { matchPhotoPlay } from "./match-photo-play";
import type { LogPlayResult } from "@/lib/user-played-songs/user-played-song";

export async function matchAndLogPlay(
  capture: DdrCapture,
): Promise<LogPlayResult> {
  const outcome = await matchPhotoPlay(capture, { forceAutoLog: true });

  if (outcome.mode === "preview") {
    throw new Error("Unexpected preview outcome during forced auto-log");
  }

  return outcome.result;
}
