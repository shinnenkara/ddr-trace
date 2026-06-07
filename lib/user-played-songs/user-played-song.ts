import type { UserPlayedSong } from "@/lib/db/schema";

export type { UserPlayedSong };

export type LogPlayResult = {
  plays: UserPlayedSong[];
  batchId: string | null;
};
