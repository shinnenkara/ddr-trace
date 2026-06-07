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
import type { PreviewPlayRow } from "@/lib/ddr-match/photo-match-outcome";
import type { LogPlayResult } from "@/lib/user-played-songs/user-played-song";

type Props = {
  capture: CapturedImage;
  rows: PreviewPlayRow[];
  onRetake: () => void;
  onMatch: (result: LogPlayResult) => void;
};

export function MatchPreviewState({
  capture,
  rows,
  onRetake,
  onMatch,
}: Props) {
  const dict = useDictionary();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  const handleConfirm = async () => {
    setPending(true);
    setError(undefined);

    try {
      const formData = buildDdrCaptureFormData(capture);
      formData.set("rows", JSON.stringify(rows));
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
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <div className="flex justify-center">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                type="button"
                className="h-auto w-auto overflow-hidden p-0 shadow-md transition-transform hover:scale-105"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="size-[120px] object-cover"
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

        <div>
          <h3 className="mb-2 text-sm font-medium">
            {dict.logPlay.photo.preview.title}
          </h3>
          <MatchedPlayRows rows={rows} showLowConfidenceHint />
        </div>
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
        <Button onClick={() => void handleConfirm()} disabled={pending}>
          {pending
            ? dict.logPlay.photo.preview.confirming
            : dict.logPlay.photo.preview.confirm}
        </Button>
      </DrawerFooter>
    </div>
  );
}
