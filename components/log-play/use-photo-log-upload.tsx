import { JSX, useState } from "react";
import {
  CapturedImage,
  fileToCapturedImage,
  useCaptureImage,
} from "@/components/capture/use-capture-image";
import { PhotoLogState } from "@/components/log-play/photo-log-state";
import { CaptureState } from "@/components/capture/capture-state";
import { InstantMatchState } from "@/components/log-play/instant-match-state";
import { useDictionary } from "@/lib/i18n/dictionary-provider";
import type { LogPlayResult } from "@/lib/user-played-songs/user-played-song";

export type PhotoLogUploadProps = {
  title: string;
  content: JSX.Element;
};

type Props = {
  onMatch: (result: LogPlayResult) => void;
};

export function usePhotoLogUpload({ onMatch }: Props): PhotoLogUploadProps {
  const dict = useDictionary();
  const [state, setState] = useState<PhotoLogState>(PhotoLogState.CAPTURE);
  const [capture, setCapture] = useState<CapturedImage>();
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

  const handleFileSelected = async (file: File) => {
    setIsProcessing(true);
    try {
      const processed = await fileToCapturedImage(file);
      onCapture(processed);
    } finally {
      setIsProcessing(false);
    }
  };

  const contents: Record<PhotoLogState, JSX.Element> = {
    [PhotoLogState.CAPTURE]: (
      <CaptureState
        onCapture={handleWebcamCapture}
        onFileSelected={handleFileSelected}
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
  };

  const titles: Record<PhotoLogState, string> = {
    [PhotoLogState.CAPTURE]: isProcessing
      ? dict.logPlay.photo.processing
      : dict.logPlay.photo.takePhoto,
    [PhotoLogState.INSTANT_MATCH]: dict.logPlay.photo.matchCapture,
  };

  return {
    title: titles[state],
    content: contents[state],
  };
}
