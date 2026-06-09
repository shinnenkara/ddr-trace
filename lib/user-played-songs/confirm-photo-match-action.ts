"use server";

import { z } from "zod";
import { Validator } from "@/lib/api/validator";
import { tryAction } from "@/lib/api/try-action";
import type { ActionDataState } from "@/lib/api/action-data-state";
import { confirmPhotoMatchPlays } from "@/lib/ddr-match/match-photo-play";
import {
  confirmPhotoMatchSchema,
  previewPlayRowSchema,
} from "@/lib/user-played-songs/confirm-photo-match-schema";
import type { LogPlayResult } from "@/lib/user-played-songs/user-played-song";
import { revalidatePath } from "next/cache";

const confirmFormSchema = confirmPhotoMatchSchema.extend({
  rows: z.preprocess((value) => {
    if (typeof value === "string") {
      return JSON.parse(value);
    }
    return value;
  }, z.array(previewPlayRowSchema).min(1)),
});

export async function confirmPhotoMatchAction(
  _prevState: ActionDataState<LogPlayResult>,
  formData: FormData,
): Promise<ActionDataState<LogPlayResult>> {
  const validator = new Validator(confirmFormSchema);
  const response: ActionDataState<LogPlayResult> = {};

  await tryAction(response, async () => {
    const data = await validator.validateAuth(formData);
    response.data = await confirmPhotoMatchPlays(
      {
        user_id: data.user_id,
        played_at: data.played_at,
        chart_type: data.chart_type,
      },
      data.rows,
    );
  });

  if (response.data) {
    revalidatePath("/log");
    revalidatePath("/track");
  }

  return response;
}
