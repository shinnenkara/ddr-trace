import { asc, desc, or, like, count } from "drizzle-orm";
import { getDb } from "./index";
import { songs, type Song } from "./schema";

/** Columns the table is allowed to sort by (whitelist guards against bad input). */
export const SORTABLE_COLUMNS = [
  "title",
  "artist",
  "type",
  "difficulty",
  "rating",
  "song_length",
  "display_bpm_min",
] as const;

export type SortColumn = (typeof SORTABLE_COLUMNS)[number];
export type SortOrder = "asc" | "desc";

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

export type SongsQuery = {
  page: number;
  pageSize: number;
  sort: SortColumn;
  order: SortOrder;
  q: string;
};

export type SongsPage = {
  rows: Song[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  sort: SortColumn;
  order: SortOrder;
  q: string;
};

/** Coerce raw URL search params into a safe, normalized query. */
export function parseSongsQuery(params: {
  page?: string;
  pageSize?: string;
  sort?: string;
  order?: string;
  q?: string;
}): SongsQuery {
  const q = (params.q ?? "").trim();

  const sort: SortColumn = SORTABLE_COLUMNS.includes(params.sort as SortColumn)
    ? (params.sort as SortColumn)
    : "title";
  const order: SortOrder = params.order === "desc" ? "desc" : "asc";

  const pageSizeNum = Number(params.pageSize);
  const pageSize = PAGE_SIZE_OPTIONS.includes(
    pageSizeNum as (typeof PAGE_SIZE_OPTIONS)[number],
  )
    ? pageSizeNum
    : DEFAULT_PAGE_SIZE;

  const pageNum = Number(params.page);
  const page = Number.isInteger(pageNum) && pageNum > 0 ? pageNum : 1;

  return { page, pageSize, sort, order, q };
}

/** Fetch one page of songs plus the total row count for pagination. */
export async function getSongsPage(query: SongsQuery): Promise<SongsPage> {
  const db = await getDb();
  const { pageSize, sort, order, q } = query;

  const sortColumn = songs[sort];
  const orderBy = order === "desc" ? desc(sortColumn) : asc(sortColumn);

  // Case-insensitive partial match on title or artist.
  // SQLite's LIKE is already case-insensitive for ASCII (ILIKE is Postgres-only
  // and unsupported on D1).
  const where = q
    ? or(like(songs.title, `%${q}%`), like(songs.artist, `%${q}%`))
    : undefined;

  const [{ total: totalCount }] = await db
    .select({ total: count() })
    .from(songs)
    .where(where);

  const total = Number(totalCount);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(query.page, pageCount);
  const offset = (page - 1) * pageSize;

  const rows = await db
    .select()
    .from(songs)
    .where(where)
    .orderBy(orderBy)
    .limit(pageSize)
    .offset(offset);

  return { rows, total, page, pageSize, pageCount, sort, order, q };
}
