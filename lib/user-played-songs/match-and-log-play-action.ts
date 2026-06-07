"use server";

import { Validator } from "@/lib/api/validator";
import { tryAction } from "@/lib/api/try-action";
import type { ActionDataState } from "@/lib/api/action-data-state";
import { ddrCaptureSchema } from "@/lib/ddr-match/ddr-capture-schema";
import { matchAndLogPlay } from "@/lib/ddr-match/parse-results-screen";
import type { LogPlayResult } from "@/lib/user-played-songs/user-played-song";
import { revalidatePath } from "next/cache";

export async function matchAndLogPlayAction(
  _prevState: ActionDataState<LogPlayResult>,
  formData: FormData,
): Promise<ActionDataState<LogPlayResult>> {
  const validator = new Validator(ddrCaptureSchema);
  const response: ActionDataState<LogPlayResult> = {};

  await tryAction(response, async () => {
    const data = await validator.validateAuth(formData);
    response.data = await matchAndLogPlay(data);
  });

  revalidatePath("/log");
  return response;
}
