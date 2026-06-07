import { useCallback, useState } from "react";
import { buildDdrCaptureFormData } from "@/components/log-play/build-ddr-capture-form-data";
import { previewPhotoMatchAction } from "@/lib/user-played-songs/preview-photo-match-action";
import type { CapturedImage } from "@/components/capture/use-capture-image";
import type { ActionErrorKind } from "@/lib/api/action-data-state";
import type { ChartType, PlayerSide } from "@/lib/ddr-match/ai-results-schema";
import type { PreviewPlayRow } from "@/lib/ddr-match/photo-match-outcome";
import type { LogPlayResult } from "@/lib/user-played-songs/user-played-song";

type PreviewPayload = {
  rows: PreviewPlayRow[];
  overallConfidence: number;
};

type Props = {
  onMatch: (result: LogPlayResult) => void;
  onPreview: (payload: PreviewPayload) => void;
};

type SubmitOptions = {
  hint?: string;
  chartType?: ChartType;
  playerSide?: PlayerSide;
};

export function useInstantLogPlay({ onMatch, onPreview }: Props) {
  const [error, setError] = useState<string>();
  const [errorKind, setErrorKind] = useState<ActionErrorKind>();
  const [pending, setPending] = useState(false);

  const submit = useCallback(
    async (capture: CapturedImage, options: SubmitOptions = {}) => {
      setPending(true);
      setError(undefined);
      setErrorKind(undefined);

      try {
        const formData = buildDdrCaptureFormData(capture, {
          hint: options.hint,
          chartType: options.chartType ?? "single",
          playerSide: options.playerSide ?? "auto",
        });
        const result = await previewPhotoMatchAction({}, formData);

        if (result.error) {
          setError(result.error);
          setErrorKind(result.errorKind);
          return;
        }

        if (result.data?.mode === "logged") {
          onMatch(result.data.result);
          return;
        }

        if (result.data?.mode === "preview") {
          onPreview({
            rows: result.data.rows,
            overallConfidence: result.data.overallConfidence,
          });
        }
      } catch {
        setError("Something went wrong");
      } finally {
        setPending(false);
      }
    },
    [onMatch, onPreview],
  );

  return { submit, error, errorKind, pending };
}
