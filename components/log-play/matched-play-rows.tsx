"use client";

import { useDictionary } from "@/lib/i18n/dictionary-provider";
import type { PreviewPlayRow } from "@/lib/ddr-match/photo-match-outcome";

type Props = {
  rows: PreviewPlayRow[];
  showLowConfidenceHint?: boolean;
};

export function MatchedPlayRows({
  rows,
  showLowConfidenceHint = false,
}: Props) {
  const dict = useDictionary();

  return (
    <div className="space-y-3">
      {showLowConfidenceHint && (
        <p className="text-sm text-muted-foreground">
          {dict.logPlay.photo.preview.lowConfidence}
        </p>
      )}
      <ul className="divide-y rounded-md border">
        {rows.map((row) => (
          <li key={row.stage} className="space-y-1 p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                {dict.logPlay.photo.preview.stage.replace(
                  "{stage}",
                  String(row.stage),
                )}
              </span>
              <span className="tabular-nums">
                {row.arcadeScore.toLocaleString()}
              </span>
            </div>
            <p className="font-medium">{row.title}</p>
            <p className="text-muted-foreground">
              {row.artist} · {row.difficulty}
            </p>
            {row.visionTitle && row.visionTitle !== row.title && (
              <p className="text-xs text-muted-foreground">
                {dict.logPlay.photo.preview.ocrTitle.replace(
                  "{title}",
                  row.visionTitle,
                )}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
