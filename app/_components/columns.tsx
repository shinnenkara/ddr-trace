"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Song } from "../../lib/db/schema";
import type { SortColumn } from "../../lib/db/queries";

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

export const columns: ColumnDef<Song>[] = [
  {
    accessorKey: "title",
    header: "Title",
    meta: { sortKey: "title" } satisfies SongColumnMeta,
    cell: ({ row }) => (
      <span className="font-medium text-foreground">{row.original.title}</span>
    ),
  },
  {
    accessorKey: "artist",
    header: "Artist",
    meta: { sortKey: "artist" } satisfies SongColumnMeta,
  },
  {
    accessorKey: "type",
    header: "Type",
    meta: { sortKey: "type" } satisfies SongColumnMeta,
    cell: ({ row }) => (
      <span className="capitalize text-muted-foreground">
        {row.original.type}
      </span>
    ),
  },
  {
    accessorKey: "difficulty",
    header: "Difficulty",
    meta: { sortKey: "difficulty" } satisfies SongColumnMeta,
    cell: ({ row }) => (
      <span className="capitalize">{row.original.difficulty}</span>
    ),
  },
  {
    accessorKey: "rating",
    header: "Rating",
    meta: { sortKey: "rating", numeric: true } satisfies SongColumnMeta,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.rating}</span>
    ),
  },
  {
    id: "bpm",
    header: "BPM",
    meta: {
      sortKey: "display_bpm_min",
      numeric: true,
    } satisfies SongColumnMeta,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatBpm(row.original.display_bpm_min, row.original.display_bpm_max)}
      </span>
    ),
  },
  {
    accessorKey: "song_length",
    header: "Length",
    meta: { sortKey: "song_length", numeric: true } satisfies SongColumnMeta,
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatLength(row.original.song_length)}
      </span>
    ),
  },
];
