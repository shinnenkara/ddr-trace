import { useCallback, useState } from "react";
import { buildDdrCaptureFormData } from "@/components/log-play/build-ddr-capture-form-data";
import { matchAndLogPlayAction } from "@/lib/user-played-songs/match-and-log-play-action";
import type { CapturedImage } from "@/components/capture/use-capture-image";
import type { ActionErrorKind } from "@/lib/api/action-data-state";
import type { LogPlayResult } from "@/lib/user-played-songs/user-played-song";

type Props = {
  onMatch: (result: LogPlayResult) => void;
};

export function useInstantLogPlay({ onMatch }: Props) {
  const [error, setError] = useState<string>();
  const [errorKind, setErrorKind] = useState<ActionErrorKind>();
  const [pending, setPending] = useState(false);

  const submit = useCallback(
    async (capture: CapturedImage, hint?: string) => {
      setPending(true);
      setError(undefined);
      setErrorKind(undefined);

      try {
        const formData = buildDdrCaptureFormData(capture, { hint });
        const result = await matchAndLogPlayAction({}, formData);

        if (result.error) {
          setError(result.error);
          setErrorKind(result.errorKind);
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
    },
    [onMatch],
  );

  return { submit, error, errorKind, pending };
}
