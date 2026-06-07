"use server";

import { revalidatePath } from "next/cache";
import { Validator } from "@/lib/api/validator";
import { tryAction } from "@/lib/api/try-action";
import type { ActionDataState } from "@/lib/api/action-data-state";
import { deletePlaySchema } from "@/lib/user-played-songs/edit-play-schema";
import { deletePlay } from "@/lib/user-played-songs/delete-play";

export async function deletePlayAction(
  _prevState: ActionDataState<{ playId: number }>,
  formData: FormData,
): Promise<ActionDataState<{ playId: number }>> {
  const validator = new Validator(deletePlaySchema);
  const response: ActionDataState<{ playId: number }> = {};

  await tryAction(response, async () => {
    const data = await validator.validateAuth(formData);
    await deletePlay(data.user_id, data.play_id);
    response.data = { playId: data.play_id };
  });

  if (response.data) {
    revalidatePath("/track");
    revalidatePath(`/track/${response.data.playId}`);
  }

  return response;
}
