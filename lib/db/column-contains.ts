import { or, sql, type SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { songs } from "@/lib/db/schema";

/** Substring match via `instr` — avoids SQLite LIKE complexity limits on long Unicode terms. */
export function columnContains(
  column: SQLiteColumn,
  term: string,
): SQL {
  return sql`instr(${column}, ${term}) > 0`;
}

export function titleOrArtistContains(term: string) {
  return or(
    columnContains(songs.title, term),
    columnContains(songs.artist, term),
  );
}
