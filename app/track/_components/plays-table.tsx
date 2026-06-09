"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Edit02Icon } from "@hugeicons/core-free-icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useDictionary, useLocale } from "@/lib/i18n/dictionary-provider";
import { formatDifficulty } from "@/lib/i18n/song-labels";
import {
  formatArcadeScore,
  formatPlayDateTime,
} from "@/lib/user-played-songs/format-play";
import type { PlayWithSong } from "@/lib/user-played-songs/play-with-song";
import { PlayEditDrawer } from "@/components/track-play/play-edit-drawer";
import { cn } from "@/lib/utils";

type Props = {
  plays: PlayWithSong[];
};

export function PlaysTable({ plays }: Props) {
  const dict = useDictionary();
  const locale = useLocale();
  const router = useRouter();
  const [editingPlay, setEditingPlay] = useState<PlayWithSong | null>(null);

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{dict.track.columns.playedAt}</TableHead>
              <TableHead>{dict.track.columns.title}</TableHead>
              <TableHead className="hidden sm:table-cell">
                {dict.track.columns.artist}
              </TableHead>
              <TableHead className="hidden md:table-cell">
                {dict.track.columns.difficulty}
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                {dict.track.columns.rating}
              </TableHead>
              <TableHead>{dict.track.columns.score}</TableHead>
              <TableHead className="hidden md:table-cell">
                {dict.track.columns.stage}
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                {dict.track.columns.source}
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {plays.map((play) => (
              <TableRow
                key={play.id}
                className="cursor-pointer"
                onClick={() => router.push(`/track/${play.id}`)}
              >
                <TableCell className="whitespace-nowrap text-xs">
                  {formatPlayDateTime(play.playedAt, locale)}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{play.variant.song.title}</div>
                  <div className="text-xs text-muted-foreground sm:hidden">
                    {play.variant.song.artist} · ★{play.variant.rating}
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {play.variant.song.artist}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {formatDifficulty(play.variant.difficulty, dict)}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  ★{play.variant.rating}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {formatArcadeScore(play.arcadeScore)}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {play.stage ?? "—"}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-xs",
                      play.source === "photo"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {dict.track.source[play.source]}
                  </span>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    type="button"
                    aria-label={dict.track.actions.edit}
                    onClick={(event) => {
                      event.stopPropagation();
                      setEditingPlay(play);
                    }}
                  >
                    <HugeiconsIcon icon={Edit02Icon} strokeWidth={2} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editingPlay ? (
        <PlayEditDrawer
          play={editingPlay}
          onClose={() => setEditingPlay(null)}
        />
      ) : null}
    </>
  );
}

export function PlaysEmptyState() {
  const dict = useDictionary();

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-16 text-center">
      <h2 className="text-lg font-semibold">{dict.track.empty.title}</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {dict.track.empty.description}
      </p>
      <Button className="mt-6" asChild>
        <Link href="/log">{dict.track.empty.cta}</Link>
      </Button>
    </div>
  );
}
