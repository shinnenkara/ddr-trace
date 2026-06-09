"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DrawerFooter } from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MatchedPlayRows } from "@/components/log-play/matched-play-rows";
import { buildDdrCaptureFormData } from "@/components/log-play/build-ddr-capture-form-data";
import { confirmPhotoMatchAction } from "@/lib/user-played-songs/confirm-photo-match-action";
import { useDictionary } from "@/lib/i18n/dictionary-provider";
import type { CapturedImage } from "@/components/capture/use-capture-image";
import type { ChartType } from "@/lib/ddr-match/ai-results-schema";
import type { PreviewPlayRow } from "@/lib/ddr-match/photo-match-outcome";
import type { LogPlayResult } from "@/lib/user-played-songs/user-played-song";

type Props = {
  capture: CapturedImage;
  rows: PreviewPlayRow[];
  chartType: ChartType;
  onRetake: () => void;
  onMatch: (result: LogPlayResult) => void;
};

export function MatchPreviewState({
  capture,
  rows,
  chartType,
  onRetake,
  onMatch,
}: Props) {
  const dict = useDictionary();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [editableRows, setEditableRows] = useState<PreviewPlayRow[]>(rows);

  const handleConfirm = async () => {
    setPending(true);
    setError(undefined);

    try {
      const formData = buildDdrCaptureFormData(capture, { chartType });
      formData.set("rows", JSON.stringify(editableRows));
      const result = await confirmPhotoMatchAction({}, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.data) {
        onMatch(result.data);
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-1">
        <div className="flex shrink-0 justify-center">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                type="button"
                className="h-auto w-auto overflow-hidden p-0 shadow-md transition-transform hover:scale-105"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="size-20 object-cover"
                  alt={dict.logPlay.photo.previewAlt}
                  src={capture.image}
                />
              </Button>
            </DialogTrigger>
            <DialogContent className="w-fit sm:max-w-fit">
              <DialogHeader>
                <DialogTitle>{dict.logPlay.photo.previewAlt}</DialogTitle>
              </DialogHeader>
              <div className="flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="max-h-[80vh] max-w-[80vw] rounded-lg"
                  style={{ width: "auto", height: "auto" }}
                  alt={dict.logPlay.photo.previewAlt}
                  src={capture.image}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {editableRows.length === 0 ? (
          <p className="px-3 text-sm text-muted-foreground">
            {dict.logPlay.photo.preview.noMatches}
          </p>
        ) : (
          <MatchedPlayRows
            rows={editableRows}
            onRowsChange={setEditableRows}
            chartType={chartType}
            showReviewHint
          />
        )}
      </div>

      {error && <p className="px-4 text-sm text-destructive">{error}</p>}

      <DrawerFooter className="mt-2 grid grid-cols-2 gap-4 pt-0">
        <Button
          onClick={onRetake}
          variant="outline"
          disabled={pending}
          type="button"
        >
          {dict.logPlay.photo.retake}
        </Button>
        <Button
          onClick={() => void handleConfirm()}
          disabled={pending || editableRows.length === 0}
        >
          {pending
            ? dict.logPlay.photo.preview.confirming
            : dict.logPlay.photo.preview.confirm}
        </Button>
      </DrawerFooter>
    </div>
  );
}
