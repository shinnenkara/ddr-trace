import { JSX, useState } from "react";
import {
  CapturedImage,
  fileToCapturedImage,
  useCaptureImage,
} from "@/components/capture/use-capture-image";
import { PhotoLogState } from "@/components/log-play/photo-log-state";
import { CaptureState } from "@/components/capture/capture-state";
import { InstantMatchState } from "@/components/log-play/instant-match-state";
import { MatchPreviewState } from "@/components/log-play/match-preview-state";
import { MultiPhotoQueueState } from "@/components/log-play/multi-photo-queue-state";
import {
  createMultiUploadItem,
  type MultiUploadItem,
} from "@/components/log-play/multi-upload-item";
import { useDictionary } from "@/lib/i18n/dictionary-provider";
import type { ChartType } from "@/lib/ddr-match/ai-results-schema";
import type { PreviewPlayRow } from "@/lib/ddr-match/photo-match-outcome";
import type { LogPlayResult } from "@/lib/user-played-songs/user-played-song";

export type PhotoLogUploadProps = {
  title: string;
  content: JSX.Element;
};

type Props = {
  onMatch: (result: LogPlayResult) => void;
  onBatchFinished?: (result: {
    total: number;
    success: number;
    failed: number;
  }) => void;
  onQueueDone: () => void;
};

export function usePhotoLogUpload({
  onMatch,
  onBatchFinished,
  onQueueDone,
}: Props): PhotoLogUploadProps {
  const dict = useDictionary();
  const [state, setState] = useState<PhotoLogState>(PhotoLogState.CAPTURE);
  const [capture, setCapture] = useState<CapturedImage>();
  const [previewRows, setPreviewRows] = useState<PreviewPlayRow[]>([]);
  const [previewChartType, setPreviewChartType] = useState<ChartType>("single");
  const [multiCaptures, setMultiCaptures] = useState<MultiUploadItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCapture = (nextCapture: CapturedImage) => {
    setCapture(nextCapture);
    setPreviewRows([]);
    setState(PhotoLogState.INSTANT_MATCH);
  };

  const { handleCapture } = useCaptureImage({ onCapture });

  const handleRetake = () => {
    setCapture(undefined);
    setPreviewRows([]);
    setState(PhotoLogState.CAPTURE);
  };

  const handlePreview = (payload: {
    rows: PreviewPlayRow[];
    overallConfidence: number;
    chartType: ChartType;
  }) => {
    setPreviewRows(payload.rows);
    setPreviewChartType(payload.chartType);
    setState(PhotoLogState.MATCH_PREVIEW);
  };

  const handleWebcamCapture = async (src: string) => {
    setIsProcessing(true);
    try {
      await handleCapture(src);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    setIsProcessing(true);
    try {
      if (files.length === 1) {
        const processed = await fileToCapturedImage(files[0]);
        onCapture(processed);
        return;
      }

      const processed = await Promise.all(files.map(fileToCapturedImage));
      setMultiCaptures(processed.map(createMultiUploadItem));
      setState(PhotoLogState.MULTI_QUEUE);
    } finally {
      setIsProcessing(false);
    }
  };

  const contents: Record<PhotoLogState, JSX.Element> = {
    [PhotoLogState.CAPTURE]: (
      <CaptureState
        onCapture={handleWebcamCapture}
        onFilesSelected={handleFilesSelected}
      />
    ),
    [PhotoLogState.INSTANT_MATCH]: (capture && (
      <InstantMatchState
        capture={capture}
        onRetake={handleRetake}
        onPreview={handlePreview}
      />
    )) || <></>,
    [PhotoLogState.MATCH_PREVIEW]: (capture && previewRows.length > 0 && (
      <MatchPreviewState
        capture={capture}
        rows={previewRows}
        chartType={previewChartType}
        onRetake={handleRetake}
        onMatch={onMatch}
      />
    )) || <></>,
    [PhotoLogState.MULTI_QUEUE]: (
      <MultiPhotoQueueState
        captures={multiCaptures}
        onDone={onQueueDone}
        onBatchFinished={onBatchFinished}
      />
    ),
  };

  const titles: Record<PhotoLogState, string> = {
    [PhotoLogState.CAPTURE]: isProcessing
      ? dict.logPlay.photo.processing
      : dict.logPlay.photo.takePhoto,
    [PhotoLogState.INSTANT_MATCH]: dict.logPlay.photo.matchCapture,
    [PhotoLogState.MATCH_PREVIEW]: dict.logPlay.photo.preview.title,
    [PhotoLogState.MULTI_QUEUE]: dict.logPlay.photo.multiQueue.title,
  };

  return {
    title: titles[state],
    content: contents[state],
  };
}
