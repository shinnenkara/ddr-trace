import { useCallback } from "react";
import imageCompression from "browser-image-compression";
import {
  getCaptureMetadata,
  ImageMetadata,
} from "@/components/capture/get-capture-metadata";

export type ProcessedImage = {
  image: string;
  mime: string;
  metadata: ImageMetadata;
};

export type CapturedImage = {
  image: string;
  name: string;
  mime: string;
  date?: Date;
};

const captureOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: "image/webp",
};

async function resizeCapture(capture: Blob): Promise<string> {
  const file = new File([capture], "capture", {
    type: capture.type,
    lastModified: Date.now(),
  });
  const compressedFile = await imageCompression(file, captureOptions);

  const reader = new FileReader();
  const processedCapture = new Promise<string>((resolve, reject) => {
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
  });
  reader.readAsDataURL(compressedFile);

  return processedCapture;
}

async function processCapture(captureSrc: string): Promise<ProcessedImage> {
  const response = await fetch(captureSrc);
  const blob = await response.blob();

  const [metadata, capture] = await Promise.all([
    getCaptureMetadata(blob),
    resizeCapture(blob),
  ]);

  return {
    image: capture,
    mime: captureOptions.fileType,
    metadata: metadata,
  };
}

function prepareCapture(capture: ProcessedImage): CapturedImage {
  const timestamp = new Date().getTime();

  return {
    image: capture.image,
    name: `${timestamp}.webp`,
    mime: capture.mime,
    date: capture.metadata.createdAt,
  };
}

export async function fileToCapturedImage(file: File): Promise<CapturedImage> {
  const fileUrl = URL.createObjectURL(file);
  try {
    const result = await processCapture(fileUrl);
    return prepareCapture(result);
  } finally {
    URL.revokeObjectURL(fileUrl);
  }
}

type Props = {
  onCapture(capture: CapturedImage): void;
};

export function useCaptureImage({ onCapture }: Props) {
  const handleCapture = useCallback(
    async (imageSrc: string) => {
      const result = await processCapture(imageSrc);
      const capture = prepareCapture(result);
      onCapture(capture);
    },
    [onCapture],
  );

  return { handleCapture };
}
