import type { CapturedImage } from "@/components/capture/use-capture-image";
import type { ChartType, PlayerSide } from "@/lib/ddr-match/ai-results-schema";

export function buildDdrCaptureFormData(
  capture: CapturedImage,
  options?: {
    hint?: string;
    chartType?: ChartType;
    playerSide?: PlayerSide;
    playedAt?: string;
  },
): FormData {
  const formData = new FormData();
  formData.set("capture_base64", capture.image);
  formData.set("name", capture.name);
  formData.set("mime", capture.mime);
  formData.set("chart_type", options?.chartType ?? "single");
  formData.set("player_side", options?.playerSide ?? "auto");
  formData.set(
    "played_at",
    options?.playedAt ?? (capture.date ?? new Date()).toISOString(),
  );
  if (options?.hint) {
    formData.set("hint", options.hint);
  }
  return formData;
}
