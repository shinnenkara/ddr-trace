"use server";

import { Validator } from "@/lib/api/validator";
import { tryAction } from "@/lib/api/try-action";
import type { ActionDataState } from "@/lib/api/action-data-state";
import { ddrCaptureSchema } from "@/lib/ddr-match/ddr-capture-schema";
import { matchPhotoPlay } from "@/lib/ddr-match/match-photo-play";
import type { PhotoMatchOutcome } from "@/lib/ddr-match/photo-match-outcome";

export async function previewPhotoMatchAction(
  _prevState: ActionDataState<PhotoMatchOutcome>,
  formData: FormData,
): Promise<ActionDataState<PhotoMatchOutcome>> {
  const validator = new Validator(ddrCaptureSchema);
  const response: ActionDataState<PhotoMatchOutcome> = {};

  await tryAction(response, async () => {
    const data = await validator.validateAuth(formData);
    response.data = await matchPhotoPlay(data);
  });

  return response;
}
