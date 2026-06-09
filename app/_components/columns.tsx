"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Song } from "../../lib/db/schema";
import type { SortColumn } from "../../lib/db/queries";
import type { Dictionary } from "@/lib/i18n/dictionary-provider";

/** Extra per-column config we attach via TanStack's `meta` field. */
export type SongColumnMeta = {
  /** When set, the header is clickable and sorts by this DB column. */
  sortKey?: SortColumn;
  /** Right-align numeric cells. */
  numeric?: boolean;
};

function formatLength(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatBpm(min: number, max: number): string {
  return min === max ? `${min}` : `${min}–${max}`;
}

export function getSongColumns(dict: Dictionary): ColumnDef<Song>[] {
  return [
    {
      accessorKey: "title",
      header: dict.songs.columns.title,
      meta: { sortKey: "title" } satisfies SongColumnMeta,
      cell: ({ row }) => (
        <span className="font-medium text-foreground">
          {row.original.title}
        </span>
      ),
    },
    {
      accessorKey: "artist",
      header: dict.songs.columns.artist,
      meta: { sortKey: "artist" } satisfies SongColumnMeta,
    },
    {
      accessorKey: "folder",
      header: dict.songs.columns.folder,
      meta: { sortKey: "folder" } satisfies SongColumnMeta,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.folder}</span>
      ),
    },
    {
      id: "bpm",
      header: dict.songs.columns.bpm,
      meta: {
        sortKey: "display_bpm_min",
        numeric: true,
      } satisfies SongColumnMeta,
      cell: ({ row }) => (
        <span className="tabular-nums">
          {formatBpm(
            row.original.display_bpm_min,
            row.original.display_bpm_max,
          )}
        </span>
      ),
    },
    {
      accessorKey: "song_length",
      header: dict.songs.columns.length,
      meta: { sortKey: "song_length", numeric: true } satisfies SongColumnMeta,
      cell: ({ row }) => (
        <span className="tabular-nums">
          {formatLength(row.original.song_length)}
        </span>
      ),
    },
  ];
}
