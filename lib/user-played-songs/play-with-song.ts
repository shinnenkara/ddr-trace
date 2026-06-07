import type { Song, UserPlayedSong } from "@/lib/db/schema";

export type PlayWithSong = UserPlayedSong & {
  song: Song;
};

export type GetUserPlaysOptions = {
  limit?: number;
  offset?: number;
};

export type GetUserPlaysResult = {
  plays: PlayWithSong[];
  total: number;
};
