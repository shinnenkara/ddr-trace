"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDictionary } from "@/lib/i18n/dictionary-provider";
import { formatDifficulty } from "@/lib/i18n/song-labels";
import { cn } from "@/lib/utils";
import type { PreviewPlayRow } from "@/lib/ddr-match/photo-match-outcome";

type Props = {
  rows: PreviewPlayRow[];
  onRowsChange: (rows: PreviewPlayRow[]) => void;
  showReviewHint?: boolean;
};

const MAX_ARCADE_SCORE = 1000000;

const selectClassName = cn(
  "h-9 w-full rounded-md border border-input bg-input/20 px-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30",
);

export function MatchedPlayRows({
  rows,
  onRowsChange,
  showReviewHint = false,
}: Props) {
  const dict = useDictionary();

  const updateRow = (index: number, patch: Partial<PreviewPlayRow>) => {
    onRowsChange(
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const handleDifficultyChange = (index: number, songId: number) => {
    const row = rows[index];
    const option = row.difficultyOptions.find(
      (entry) => entry.songId === songId,
    );
    if (!option) {
      return;
    }
    updateRow(index, { songId: option.songId, difficulty: option.difficulty });
  };

  const handleScoreChange = (index: number, value: string) => {
    const parsed = Number.parseInt(value, 10);
    const arcadeScore = Number.isNaN(parsed)
      ? 0
      : Math.min(Math.max(parsed, 0), MAX_ARCADE_SCORE);
    updateRow(index, { arcadeScore });
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
            </div>
            <div>
              <p className="font-medium">{row.title}</p>
              <p className="text-muted-foreground">{row.artist}</p>
              {row.visionTitle && row.visionTitle !== row.title && (
                <p className="text-xs text-muted-foreground">
                  {dict.logPlay.photo.preview.ocrTitle.replace(
                    "{title}",
                    row.visionTitle,
                  )}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label htmlFor={`difficulty-${index}`}>
                  {dict.logPlay.photo.preview.difficultyLabel}
                </Label>
                <select
                  id={`difficulty-${index}`}
                  value={row.songId}
                  onChange={(event) =>
                    handleDifficultyChange(index, Number(event.target.value))
                  }
                  className={selectClassName}
                >
                  {row.difficultyOptions.map((option) => (
                    <option key={option.songId} value={option.songId}>
                      {formatDifficulty(option.difficulty, dict)} ★
                      {option.rating}
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
