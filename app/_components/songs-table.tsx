"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowUp01Icon,
  ArrowDown01Icon,
  ArrowUpDownIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Search01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Song } from "../../lib/db/schema";
import {
  PAGE_SIZE_OPTIONS,
  type SortColumn,
  type SortOrder,
} from "../../lib/db/queries";
import { columns, type SongColumnMeta } from "./columns";

type SongsTableProps = {
  data: Song[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  sort: SortColumn;
  order: SortOrder;
  q: string;
};

export function SongsTable({
  data,
  total,
  page,
  pageSize,
  pageCount,
  sort,
  order,
  q,
}: SongsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(q);

  const pushParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  // Keep the input in sync if `q` changes from outside (e.g. back/forward nav).
  useEffect(() => {
    setSearch(q);
  }, [q]);

  // Debounce search input -> URL so we don't query on every keystroke.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (search === q) return;
    const timeout = setTimeout(() => {
      pushParams({ q: search.trim() || null, page: "1" });
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleSort = (sortKey: SortColumn) => {
    const nextOrder: SortOrder =
      sort === sortKey && order === "asc" ? "desc" : "asc";
    pushParams({ sort: sortKey, order: nextOrder, page: "1" });
  };

  // React Compiler conservatively skips memoizing TanStack Table's hook.
  // Safe here: the table is recreated per render from server-provided props.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    pageCount,
  });

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className={cn("flex flex-col gap-4", isPending && "opacity-60")}>
      <div className="relative w-full sm:max-w-xs">
        <HugeiconsIcon
          icon={Search01Icon}
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title or artist…"
          className="h-8 w-full rounded-md border bg-transparent pr-8 pl-8 text-xs text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
          </button>
        )}
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as
                    | SongColumnMeta
                    | undefined;
                  const sortKey = meta?.sortKey;
                  const isSorted = sortKey === sort;
                  const label = flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  );

                  return (
                    <TableHead
                      key={header.id}
                      className={meta?.numeric ? "text-right" : undefined}
                    >
                      {sortKey ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort(sortKey)}
                          className={cn(
                            "-ml-2 h-7 data-[active=true]:text-foreground",
                            meta?.numeric && "ml-auto",
                          )}
                          data-active={isSorted}
                        >
                          {label}
                          <HugeiconsIcon
                            icon={
                              isSorted
                                ? order === "asc"
                                  ? ArrowUp01Icon
                                  : ArrowDown01Icon
                                : ArrowUpDownIcon
                            }
                            className={cn(
                              "size-3.5",
                              !isSorted && "text-muted-foreground/60",
                            )}
                          />
                        </Button>
                      ) : (
                        label
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as
                      | SongColumnMeta
                      | undefined;
                    return (
                      <TableCell
                        key={cell.id}
                        className={meta?.numeric ? "text-right" : undefined}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {q ? `No songs match “${q}”.` : "No songs found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-xs text-muted-foreground">
          Showing <span className="tabular-nums">{from}</span>–
          <span className="tabular-nums">{to}</span> of{" "}
          <span className="tabular-nums">{total}</span> songs
        </p>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Rows per page
            <select
              value={pageSize}
              onChange={(e) =>
                pushParams({ pageSize: e.target.value, page: "1" })
              }
              className="h-7 rounded-md border bg-transparent px-2 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground tabular-nums">
              Page {page} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page <= 1 || isPending}
              onClick={() => pushParams({ page: String(page - 1) })}
              aria-label="Previous page"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page >= pageCount || isPending}
              onClick={() => pushParams({ page: String(page + 1) })}
              aria-label="Next page"
            >
              <HugeiconsIcon icon={ArrowRight01Icon} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
