import type { SongVariant } from "@/lib/db/schema";
import type { Dictionary } from "./dictionary-provider";

export function formatSongType(
  type: SongVariant["type"],
  dict: Dictionary,
): string {
  return dict.songs.type[type];
}

export function formatDifficulty(value: string, dict: Dictionary): string {
  return (dict.songs.difficulty as Record<string, string>)[value] ?? value;
}
