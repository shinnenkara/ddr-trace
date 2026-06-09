import type { SongVariantWithSong, UserPlayedSong } from "@/lib/db/schema";

export type PlayWithVariant = UserPlayedSong & {
  variant: SongVariantWithSong;
};

/** @deprecated Use PlayWithVariant */
export type PlayWithSong = PlayWithVariant;

export type GetUserPlaysOptions = {
  limit?: number;
  offset?: number;
};

export type GetUserPlaysResult = {
  plays: PlayWithVariant[];
  total: number;
};
