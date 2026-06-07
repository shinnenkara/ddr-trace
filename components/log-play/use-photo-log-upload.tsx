import { JSX, useState } from "react";
import {
  CapturedImage,
  fileToCapturedImage,
  useCaptureImage,
} from "@/components/capture/use-capture-image";
import { PhotoLogState } from "@/components/log-play/photo-log-state";
import { CaptureState } from "@/components/capture/capture-state";
import { InstantMatchState } from "@/components/log-play/instant-match-state";
import { MultiPhotoQueueState } from "@/components/log-play/multi-photo-queue-state";
import {
  createMultiUploadItem,
  type MultiUploadItem,
} from "@/components/log-play/multi-upload-item";
import { useDictionary } from "@/lib/i18n/dictionary-provider";
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
  const [multiCaptures, setMultiCaptures] = useState<MultiUploadItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCapture = (nextCapture: CapturedImage) => {
    setCapture(nextCapture);
    setState(PhotoLogState.INSTANT_MATCH);
  };

  const { handleCapture } = useCaptureImage({ onCapture });

  const handleRetake = () => {
    setCapture(undefined);
    setState(PhotoLogState.CAPTURE);
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
    [PhotoLogState.INSTANT_MATCH]:
      (capture && (
        <InstantMatchState
          capture={capture}
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
    [PhotoLogState.MULTI_QUEUE]: dict.logPlay.photo.multiQueue.title,
  };

  return {
    title: titles[state],
    content: contents[state],
  };
}
