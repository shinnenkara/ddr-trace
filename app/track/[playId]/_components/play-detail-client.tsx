"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScoreProgressChart } from "@/components/track-play/score-progress-chart";
import { PlayEditDrawer } from "@/components/track-play/play-edit-drawer";
import { useDictionary, useLocale } from "@/lib/i18n/dictionary-provider";
import { formatDifficulty, formatSongType } from "@/lib/i18n/song-labels";
import {
  formatArcadeScore,
  formatPlayDateTime,
} from "@/lib/user-played-songs/format-play";
import type { PlayWithSong } from "@/lib/user-played-songs/play-with-song";
import type { UserPlayedSong } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type Props = {
  play: PlayWithSong;
  history: UserPlayedSong[];
};

export function PlayDetailClient({ play, history }: Props) {
  const dict = useDictionary();
  const locale = useLocale();
  const [isEditing, setIsEditing] = useState(false);

  const personalBest = Math.max(...history.map((entry) => entry.arcadeScore));
  const latestScore =
    history[history.length - 1]?.arcadeScore ?? play.arcadeScore;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" className="-ml-2 mb-2" asChild>
            <Link href="/track">{dict.track.detail.back}</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {play.variant.song.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {play.variant.song.artist} ·{" "}
            {formatSongType(play.variant.type, dict)} ·{" "}
            {formatDifficulty(play.variant.difficulty, dict)} · ★
            {play.variant.rating}
          </p>
        </div>
        <Button onClick={() => setIsEditing(true)}>
          {dict.track.detail.edit}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={dict.track.detail.personalBest}
          value={formatArcadeScore(personalBest)}
        />
        <StatCard
          label={dict.track.detail.attempts}
          value={String(history.length)}
        />
        <StatCard
          label={dict.track.detail.latestScore}
          value={formatArcadeScore(latestScore)}
        />
      </div>

      <section className="grid gap-4">
        <h2 className="text-lg font-medium">{dict.track.detail.scoreChart}</h2>
        <ScoreProgressChart
          history={history}
          highlightedPlayId={play.id}
          personalBest={personalBest}
        />
      </section>

      <section className="grid gap-4">
        <h2 className="text-lg font-medium">
          {dict.track.detail.attemptHistory}
        </h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{dict.track.columns.playedAt}</TableHead>
                <TableHead>{dict.track.columns.score}</TableHead>
                <TableHead>{dict.track.columns.stage}</TableHead>
                <TableHead>{dict.track.columns.source}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((entry) => (
                <TableRow
                  key={entry.id}
                  className={cn(entry.id === play.id && "bg-muted/50")}
                >
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatPlayDateTime(entry.playedAt, locale)}
                    {entry.id === play.id ? (
                      <span className="ml-2 text-xs text-primary">
                        ({dict.track.detail.highlighted})
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatArcadeScore(entry.arcadeScore)}
                  </TableCell>
                  <TableCell>{entry.stage ?? "—"}</TableCell>
                  <TableCell>{dict.track.source[entry.source]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {isEditing ? (
        <PlayEditDrawer
          play={play}
          onClose={() => setIsEditing(false)}
          redirectOnDelete
        />
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
