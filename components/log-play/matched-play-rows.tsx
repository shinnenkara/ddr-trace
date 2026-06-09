"use client";

import { useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/lib/i18n/dictionary-provider";
import { formatDifficulty } from "@/lib/i18n/song-labels";
import { cn } from "@/lib/utils";
import { searchSongsAction } from "@/lib/user-played-songs/search-songs-action";
import { getDifficultiesForSongAction } from "@/lib/user-played-songs/get-difficulties-for-song-action";
import { MIN_RESOLVE_CONFIDENCE } from "@/lib/ddr-match/vision-errors";
import type { ChartType } from "@/lib/ddr-match/ai-results-schema";
import type {
  PreviewDifficultyOption,
  PreviewPlayRow,
  PreviewSongOption,
} from "@/lib/ddr-match/photo-match-outcome";
import type { SongVariantWithSong } from "@/lib/db/schema";

type Props = {
  rows: PreviewPlayRow[];
  onRowsChange: (rows: PreviewPlayRow[]) => void;
  chartType?: ChartType;
  showReviewHint?: boolean;
};

const MAX_ARCADE_SCORE = 1000000;

const selectClassName = cn(
  "h-9 w-full rounded-md border border-input bg-input/20 px-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30",
);

function formatSongLabel(
  option: PreviewSongOption,
  dict: ReturnType<typeof useDictionary>,
): string {
  const base = `${option.title} — ${option.artist}`;
  const parts: string[] = [];

  if (option.manual) {
    parts.push(dict.logPlay.photo.preview.manualSongMark);
  }
  if (option.matchScore < MIN_RESOLVE_CONFIDENCE) {
    parts.push(`${Math.round(option.matchScore * 100)}%`);
  }

  return parts.length > 0 ? `${base} (${parts.join(", ")})` : base;
}

function formatDifficultyLabel(
  option: PreviewDifficultyOption,
  dict: ReturnType<typeof useDictionary>,
): string {
  const base = `${formatDifficulty(option.difficulty, dict)} ★${option.rating}`;
  return option.suggested
    ? `${base} (${dict.logPlay.photo.preview.suggestedFromPhoto})`
    : base;
}

function pickDefaultDifficulty(
  options: PreviewDifficultyOption[],
): PreviewDifficultyOption | undefined {
  return options.find((option) => option.suggested) ?? options[0];
}

function appendManualSongOption(
  songOptions: PreviewSongOption[],
  song: { songDbId: number; title: string; artist: string },
): PreviewSongOption[] {
  const existing = songOptions.find(
    (option) => option.songDbId === song.songDbId,
  );

  if (existing) {
    return songOptions.map((option) =>
      option.songDbId === song.songDbId
        ? { ...option, manual: true }
        : option,
    );
  }

  return [
    ...songOptions,
    {
      songDbId: song.songDbId,
      title: song.title,
      artist: song.artist,
      matchScore: 0,
      manual: true,
    },
  ];
}

function dedupeSongsFromVariants(
  variants: SongVariantWithSong[],
): Array<{ songDbId: number; title: string; artist: string }> {
  const seen = new Set<number>();
  const songs: Array<{ songDbId: number; title: string; artist: string }> = [];

  for (const variant of variants) {
    if (seen.has(variant.songId)) {
      continue;
    }
    seen.add(variant.songId);
    songs.push({
      songDbId: variant.songId,
      title: variant.song.title,
      artist: variant.song.artist,
    });
  }

  return songs;
}

export function MatchedPlayRows({
  rows,
  onRowsChange,
  chartType = "single",
  showReviewHint = false,
}: Props) {
  const dict = useDictionary();
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const [manualSearchIndex, setManualSearchIndex] = useState<number | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SongVariantWithSong[]>([]);
  const [isSearching, startSearch] = useTransition();
  const [loadingDifficultiesIndex, setLoadingDifficultiesIndex] = useState<
    number | null
  >(null);

  const updateRow = (index: number, patch: Partial<PreviewPlayRow>) => {
    onRowsChange(
      rowsRef.current.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    );
  };

  const applySongSelection = async (
    index: number,
    song: {
      songDbId: number;
      title: string;
      artist: string;
      matchScore: number;
      matchSource: "ranked" | "manual";
      songOptions?: PreviewSongOption[];
    },
  ) => {
    const row = rowsRef.current[index];
    if (!row) {
      return;
    }

    setLoadingDifficultiesIndex(index);

    try {
      const songOptions = song.songOptions ?? row.songOptions;
      const difficultyOptions = await getDifficultiesForSongAction({
        songDbId: song.songDbId,
        chartType,
        difficultyColor: row.suggestedDifficultyColor ?? undefined,
      });

      const selected = pickDefaultDifficulty(difficultyOptions);

      updateRow(index, {
        songOptions,
        songDbId: song.songDbId,
        title: song.title,
        artist: song.artist,
        matchScore: song.matchScore,
        matchSource: song.matchSource,
        difficultyOptions,
        songId: selected?.songId ?? row.songId,
        difficulty: selected?.difficulty ?? row.difficulty,
      });
    } finally {
      setLoadingDifficultiesIndex(null);
    }
  };

  const handleSongChange = async (index: number, songDbId: number) => {
    const row = rowsRef.current[index];
    const option = row?.songOptions.find(
      (entry) => entry.songDbId === songDbId,
    );
    if (!option) {
      return;
    }

    await applySongSelection(index, {
      songDbId: option.songDbId,
      title: option.title,
      artist: option.artist,
      matchScore: option.matchScore,
      matchSource: option.manual ? "manual" : "ranked",
    });
  };

  const handleDifficultyChange = (index: number, songId: number) => {
    const row = rowsRef.current[index];
    const option = row?.difficultyOptions.find(
      (entry) => entry.songId === songId,
    );
    if (!option) {
      return;
    }
    updateRow(index, {
      songId: option.songId,
      difficulty: option.difficulty,
    });
  };

  const handleScoreChange = (index: number, value: string) => {
    const parsed = Number.parseInt(value, 10);
    const arcadeScore = Number.isNaN(parsed)
      ? 0
      : Math.min(Math.max(parsed, 0), MAX_ARCADE_SCORE);
    updateRow(index, { arcadeScore });
  };

  const openManualSearch = (index: number) => {
    setManualSearchIndex(index);
    setSearchQuery("");
    setSearchResults([]);
  };

  const closeManualSearch = () => {
    setManualSearchIndex(null);
    setSearchQuery("");
    setSearchResults([]);
  };

  const runSearch = (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    startSearch(async () => {
      const results = await searchSongsAction(query, 15);
      setSearchResults(results.filter((variant) => variant.type === chartType));
    });
  };

  const handleManualPick = async (
    index: number,
    variant: SongVariantWithSong,
  ) => {
    const row = rowsRef.current[index];
    if (!row) {
      return;
    }

    const songOptions = appendManualSongOption(row.songOptions, {
      songDbId: variant.songId,
      title: variant.song.title,
      artist: variant.song.artist,
    });

    await applySongSelection(index, {
      songDbId: variant.songId,
      title: variant.song.title,
      artist: variant.song.artist,
      matchScore: 0,
      matchSource: "manual",
      songOptions,
    });
    closeManualSearch();
  };

  return (
    <div className="space-y-3">
      {showReviewHint && (
        <p className="text-sm text-muted-foreground">
          {dict.logPlay.photo.preview.reviewHint}
        </p>
      )}
      <ul className="divide-y rounded-md border">
        {rows.map((row, index) => (
          <li key={index} className="space-y-3 p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                {dict.logPlay.photo.preview.stage.replace(
                  "{stage}",
                  String(row.stage),
                )}
              </span>
              {row.matchScore < MIN_RESOLVE_CONFIDENCE && (
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  {dict.logPlay.photo.preview.lowConfidenceRow}
                </span>
              )}
            </div>
            {row.visionTitle && (
              <p className="text-xs text-muted-foreground">
                {dict.logPlay.photo.preview.ocrTitle.replace(
                  "{title}",
                  row.visionTitle,
                )}
              </p>
            )}
            <div className="grid gap-3">
              <div className="grid gap-1">
                <Label htmlFor={`song-${index}`}>
                  {dict.logPlay.photo.preview.songLabel}
                </Label>
                <select
                  id={`song-${index}`}
                  value={row.songDbId}
                  disabled={loadingDifficultiesIndex === index}
                  onChange={(event) =>
                    void handleSongChange(index, Number(event.target.value))
                  }
                  className={selectClassName}
                >
                  {row.songOptions.map((option) => (
                    <option key={option.songDbId} value={option.songDbId}>
                      {formatSongLabel(option, dict)}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto justify-start px-0 text-xs"
                  onClick={() => openManualSearch(index)}
                >
                  {dict.logPlay.photo.preview.manualSearch}
                </Button>
              </div>
              {manualSearchIndex === index && (
                <div className="grid gap-2 rounded-md border bg-muted/30 p-3">
                  <Label htmlFor={`manual-search-${index}`}>
                    {dict.logPlay.photo.preview.manualSearchLabel}
                  </Label>
                  <Input
                    id={`manual-search-${index}`}
                    value={searchQuery}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSearchQuery(value);
                      runSearch(value);
                    }}
                    placeholder={
                      dict.logPlay.photo.preview.manualSearchPlaceholder
                    }
                    autoComplete="off"
                  />
                  {isSearching && (
                    <p className="text-xs text-muted-foreground">
                      {dict.logPlay.manual.searching}
                    </p>
                  )}
                  {searchResults.length > 0 && (
                    <ul className="max-h-40 overflow-y-auto rounded-md border">
                      {dedupeSongsFromVariants(searchResults).map((song) => (
                        <li key={song.songDbId}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-xs hover:bg-muted"
                            onClick={() => {
                              const variant = searchResults.find(
                                (entry) => entry.songId === song.songDbId,
                              );
                              if (variant) {
                                void handleManualPick(index, variant);
                              }
                            }}
                          >
                            {song.title} — {song.artist}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={closeManualSearch}
                  >
                    {dict.logPlay.photo.preview.manualSearchCancel}
                  </Button>
                </div>
              )}
              <div className="grid gap-1">
                <Label htmlFor={`difficulty-${index}`}>
                  {dict.logPlay.photo.preview.difficultyLabel}
                </Label>
                <select
                  id={`difficulty-${index}`}
                  value={row.songId}
                  disabled={
                    loadingDifficultiesIndex === index ||
                    row.difficultyOptions.length === 0
                  }
                  onChange={(event) =>
                    handleDifficultyChange(index, Number(event.target.value))
                  }
                  className={selectClassName}
                >
                  {row.difficultyOptions.map((option) => (
                    <option key={option.songId} value={option.songId}>
                      {formatDifficultyLabel(option, dict)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1">
                <Label htmlFor={`score-${index}`}>
                  {dict.logPlay.photo.preview.scoreLabel}
                </Label>
                <Input
                  id={`score-${index}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={MAX_ARCADE_SCORE}
                  value={row.arcadeScore}
                  onChange={(event) =>
                    handleScoreChange(index, event.target.value)
                  }
                  className="h-9 tabular-nums"
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
