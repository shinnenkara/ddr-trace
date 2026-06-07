import type { CapturedImage } from "@/components/capture/use-capture-image";

export type MultiUploadItem = {
  id: string;
  capture: CapturedImage;
};

export function createMultiUploadItem(capture: CapturedImage): MultiUploadItem {
  return {
    id: crypto.randomUUID(),
    capture,
  };
}
