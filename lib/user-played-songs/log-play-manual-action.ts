"use server";

import { Validator } from "@/lib/api/validator";
import { tryAction } from "@/lib/api/try-action";
import type { ActionDataState } from "@/lib/api/action-data-state";
import { logPlayManualSchema } from "@/lib/user-played-songs/log-play-schema";
import { insertPlayedSongs } from "@/lib/user-played-songs/insert-played-songs";
import type { LogPlayResult } from "@/lib/user-played-songs/user-played-song";
import { revalidatePath } from "next/cache";

export async function logPlayManualAction(
  _prevState: ActionDataState<LogPlayResult>,
  formData: FormData,
): Promise<ActionDataState<LogPlayResult>> {
  const validator = new Validator(logPlayManualSchema);
  const response: ActionDataState<LogPlayResult> = {};

  await tryAction(response, async () => {
    const data = await validator.validateAuth(formData);
    const plays = await insertPlayedSongs([
      {
        userId: data.user_id,
        songVariantId: data.song_id,
        arcadeScore: data.arcade_score,
        stage: data.stage ?? null,
        speedModifier: data.speed_modifier ?? null,
        playedAt: data.played_at,
        source: "manual",
      },
    ]);

    response.data = { plays, batchId: null };
  });

  if (response.data) {
    revalidatePath("/log");
    revalidatePath("/track");
  }

  return response;
}
