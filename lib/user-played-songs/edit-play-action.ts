"use server";

import { revalidatePath } from "next/cache";
import { Validator } from "@/lib/api/validator";
import { tryAction } from "@/lib/api/try-action";
import type { ActionDataState } from "@/lib/api/action-data-state";
import { editPlaySchema } from "@/lib/user-played-songs/edit-play-schema";
import { editPlay } from "@/lib/user-played-songs/edit-play";
import type { UserPlayedSong } from "@/lib/db/schema";

export async function editPlayAction(
  _prevState: ActionDataState<UserPlayedSong>,
  formData: FormData,
): Promise<ActionDataState<UserPlayedSong>> {
  const validator = new Validator(editPlaySchema);
  const response: ActionDataState<UserPlayedSong> = {};

  await tryAction(response, async () => {
    const data = await validator.validateAuth(formData);
    const { user_id, ...input } = data;
    response.data = await editPlay(user_id, input);
  });

  if (response.data) {
    revalidatePath("/track");
    revalidatePath(`/track/${response.data.id}`);
  }

  return response;
}
