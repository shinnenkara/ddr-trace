import type { CapturedImage } from "@/components/capture/use-capture-image";

export function buildDdrCaptureFormData(
  capture: CapturedImage,
  options?: { hint?: string; playedAt?: string },
): FormData {
  const formData = new FormData();
  formData.set("capture_base64", capture.image);
  formData.set("name", capture.name);
  formData.set("mime", capture.mime);
  formData.set(
    "played_at",
    options?.playedAt ?? (capture.date ?? new Date()).toISOString(),
  );
  if (options?.hint) {
    formData.set("hint", options.hint);
  }
  return formData;
}
