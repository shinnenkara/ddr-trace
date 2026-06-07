"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DrawerFooter } from "@/components/ui/drawer";
import { CapturedImage } from "@/components/capture/use-capture-image";
import { DdrCaptureForm } from "@/components/log-play/ddr-capture-form";
import { useInstantLogPlay } from "@/components/log-play/use-instant-log-play";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useDictionary } from "@/lib/i18n/dictionary-provider";
import type { ChartType, PlayerSide } from "@/lib/ddr-match/ai-results-schema";
import type { PreviewPlayRow } from "@/lib/ddr-match/photo-match-outcome";
import type { LogPlayResult } from "@/lib/user-played-songs/user-played-song";

type Props = {
  capture: CapturedImage;
  onRetake: () => void;
  onMatch: (result: LogPlayResult) => void;
  onPreview: (payload: {
    rows: PreviewPlayRow[];
    overallConfidence: number;
  }) => void;
};

export function InstantMatchState({
  capture,
  onRetake,
  onMatch,
  onPreview,
}: Props) {
  const dict = useDictionary();
  const [hint, setHint] = useState("");
  const [chartType, setChartType] = useState<ChartType>("single");
  const [playerSide, setPlayerSide] = useState<PlayerSide>("auto");
  const { submit, error, pending } = useInstantLogPlay({ onMatch, onPreview });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void submit(capture, {
      hint: hint.trim() || undefined,
      chartType,
      playerSide,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="grid w-full max-w-md grid-cols-1 items-center gap-8 md:max-w-4xl md:grid-cols-2">
          <div className="flex justify-center md:justify-end">
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
          <div className="w-full">
            <DdrCaptureForm
              chartType={chartType}
              onChartTypeChange={setChartType}
              playerSide={playerSide}
              onPlayerSideChange={setPlayerSide}
              hint={hint}
              onHintChange={setHint}
            />
          </div>
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
        <Button type="submit" disabled={pending}>
          {pending ? dict.logPlay.photo.matching : dict.logPlay.photo.match}
        </Button>
      </DrawerFooter>
    </form>
  );
}
