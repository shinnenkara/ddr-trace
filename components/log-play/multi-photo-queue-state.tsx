"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { DrawerFooter } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MatchedPlayRows } from "@/components/log-play/matched-play-rows";
import { buildDdrCaptureFormData } from "@/components/log-play/build-ddr-capture-form-data";
import type { MultiUploadItem } from "@/components/log-play/multi-upload-item";
import { previewPhotoMatchAction } from "@/lib/user-played-songs/preview-photo-match-action";
import { confirmPhotoMatchAction } from "@/lib/user-played-songs/confirm-photo-match-action";
import type { ActionErrorKind } from "@/lib/api/action-data-state";
import type { ChartType, PlayerSide } from "@/lib/ddr-match/ai-results-schema";
import type { PreviewPlayRow } from "@/lib/ddr-match/photo-match-outcome";
import { useDictionary } from "@/lib/i18n/dictionary-provider";
import { cn } from "@/lib/utils";

type QueueStatus = "queued" | "uploading" | "success" | "error";
type QueuePhase = "matching" | "review";

type QueueUploadItem = MultiUploadItem & {
  status: QueueStatus;
  error?: string;
  errorKind?: ActionErrorKind;
  hint?: string;
  rows?: PreviewPlayRow[];
};

const selectClassName = cn(
  "h-7 w-full rounded-md border border-input bg-input/20 px-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 md:text-xs/relaxed dark:bg-input/30",
);

type Props = {
  captures: MultiUploadItem[];
  onDone: () => void;
  onBatchFinished?: (result: {
    total: number;
    success: number;
    failed: number;
  }) => void;
};

export function MultiPhotoQueueState({
  captures,
  onDone,
  onBatchFinished,
}: Props) {
  const dict = useDictionary();
  const [items, setItems] = useState<QueueUploadItem[]>([]);
  const [chartType, setChartType] = useState<ChartType>("single");
  const [playerSide, setPlayerSide] = useState<PlayerSide>("auto");
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<QueuePhase>("matching");
  const [editableRows, setEditableRows] = useState<PreviewPlayRow[]>([]);
  const [confirmPending, setConfirmPending] = useState(false);
  const [confirmError, setConfirmError] = useState<string>();
  const itemsRef = useRef(items);

  itemsRef.current = items;

  useEffect(() => {
    setItems(
      captures.map((capture) => ({ ...capture, status: "queued", hint: "" })),
    );
    setPhase("matching");
  }, [captures]);

  const uploadCapture = useCallback(
    async (item: QueueUploadItem) => {
      setItems((previous) =>
        previous.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                status: "uploading",
                error: undefined,
                errorKind: undefined,
                rows: undefined,
              }
            : entry,
        ),
      );

      const latest = itemsRef.current.find((entry) => entry.id === item.id);
      const hint = latest?.hint?.trim() ? latest.hint.trim() : undefined;
      const playedAt = (item.capture.date ?? new Date()).toISOString();

      try {
        const response = await previewPhotoMatchAction(
          {},
          buildDdrCaptureFormData(item.capture, {
            hint,
            chartType,
            playerSide,
          }),
        );

        if (response.data) {
          const rows = response.data.rows.map((row) => ({ ...row, playedAt }));
          setItems((previous) =>
            previous.map((entry) =>
              entry.id === item.id
                ? {
                    ...entry,
                    status: "success",
                    error: undefined,
                    errorKind: undefined,
                    rows,
                  }
                : entry,
            ),
          );
          return;
        }

        setItems((previous) =>
          previous.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  status: "error",
                  error:
                    response.error ??
                    dict.logPlay.photo.multiQueue.uploadFailed,
                  errorKind: response.errorKind,
                  rows: undefined,
                }
              : entry,
          ),
        );
      } catch (error: unknown) {
        setItems((previous) =>
          previous.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  status: "error",
                  error:
                    error instanceof Error
                      ? error.message
                      : dict.logPlay.photo.multiQueue.uploadFailed,
                  rows: undefined,
                }
              : entry,
          ),
        );
      }
    },
    [chartType, playerSide, dict.logPlay.photo.multiQueue.uploadFailed],
  );

  useEffect(() => {
    if (captures.length === 0) {
      return;
    }

    let cancelled = false;

    const runQueue = async () => {
      setIsRunning(true);
      try {
        for (const capture of captures) {
          if (cancelled) {
            break;
          }

          const item = itemsRef.current.find(
            (entry) => entry.id === capture.id,
          );
          await uploadCapture(
            item ?? { ...capture, status: "queued", hint: "" },
          );
        }
      } finally {
        if (!cancelled) {
          setIsRunning(false);
        }
      }
    };

    void runQueue();

    return () => {
      cancelled = true;
    };
  }, [captures, uploadCapture]);

  const stats = useMemo(() => {
    const success = items.filter((item) => item.status === "success").length;
    const failed = items.filter((item) => item.status === "error").length;
    const completed = success + failed;
    const total = items.length;
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

    return {
      total,
      success,
      failed,
      completed,
      progress,
      isCompleted: total > 0 && completed === total,
    };
  }, [items]);

  const handleReupload = async (itemId: string) => {
    const item = items.find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }

    await uploadCapture(item);
  };

  const handleHintChange = (itemId: string, hint: string) => {
    setItems((previous) =>
      previous.map((entry) =>
        entry.id === itemId ? { ...entry, hint } : entry,
      ),
    );
  };

  const handleReview = () => {
    const rows = items
      .filter((item) => item.status === "success" && item.rows)
      .flatMap((item) => item.rows ?? []);
    setEditableRows(rows);
    setConfirmError(undefined);
    setPhase("review");
  };

  const handleLogAll = async () => {
    setConfirmPending(true);
    setConfirmError(undefined);

    try {
      const formData = new FormData();
      formData.set("played_at", new Date().toISOString());
      formData.set("chart_type", chartType);
      formData.set("rows", JSON.stringify(editableRows));
      const result = await confirmPhotoMatchAction({}, formData);

      if (result.error) {
        setConfirmError(result.error);
        return;
      }

      onBatchFinished?.({
        total: stats.total,
        success: stats.success,
        failed: stats.failed,
      });
      onDone();
    } catch {
      setConfirmError(dict.logPlay.photo.multiQueue.uploadFailed);
    } finally {
      setConfirmPending(false);
    }
  };

  const statusLabel = (status: QueueStatus) => {
    switch (status) {
      case "queued":
        return dict.logPlay.photo.multiQueue.queued;
      case "uploading":
        return dict.logPlay.photo.multiQueue.uploading;
      case "success":
        return dict.logPlay.photo.multiQueue.success;
      case "error":
        return dict.logPlay.photo.multiQueue.error;
    }
  };

  if (phase === "review") {
    return (
      <div className="flex h-full flex-col">
        <div className="max-h-[60vh] flex-1 overflow-y-auto px-4">
          <h3 className="mb-2 text-sm font-medium">
            {dict.logPlay.photo.multiQueue.reviewTitle}
          </h3>
          <MatchedPlayRows
            rows={editableRows}
            onRowsChange={setEditableRows}
            chartType={chartType}
            showReviewHint
          />
          {confirmError && (
            <p className="mt-2 text-sm text-destructive">{confirmError}</p>
          )}
        </div>

        <DrawerFooter className="grid grid-cols-2 gap-4 pt-2">
          <Button
            variant="outline"
            type="button"
            disabled={confirmPending}
            onClick={() => setPhase("matching")}
          >
            {dict.logPlay.photo.multiQueue.back}
          </Button>
          <Button
            type="button"
            disabled={confirmPending || editableRows.length === 0}
            onClick={() => void handleLogAll()}
          >
            {confirmPending
              ? dict.logPlay.photo.multiQueue.logging
              : dict.logPlay.photo.multiQueue.logAll}
          </Button>
        </DrawerFooter>
      </div>
    );
  }

  const noMatches = stats.isCompleted && stats.success === 0;

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-2">
        <div className="mb-3 grid gap-2">
          <Label htmlFor="queue-chart-type">
            {dict.logPlay.photo.chartType}
          </Label>
          <select
            id="queue-chart-type"
            value={chartType}
            onChange={(event) => setChartType(event.target.value as ChartType)}
            disabled={isRunning}
            className={selectClassName}
          >
            <option value="single">{dict.songs.type.single}</option>
            <option value="double">{dict.songs.type.double}</option>
          </select>
        </div>
        <div className="mb-3 grid gap-2">
          <Label htmlFor="queue-player-side">
            {dict.logPlay.photo.playerSide}
          </Label>
          <select
            id="queue-player-side"
            value={playerSide}
            onChange={(event) =>
              setPlayerSide(event.target.value as PlayerSide)
            }
            disabled={isRunning}
            className={selectClassName}
          >
            <option value="auto">{dict.logPlay.photo.playerSideAuto}</option>
            <option value="left">{dict.logPlay.photo.playerSideLeft}</option>
            <option value="right">{dict.logPlay.photo.playerSideRight}</option>
          </select>
        </div>
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {dict.logPlay.photo.multiQueue.progress
              .replace("{done}", String(stats.completed))
              .replace("{total}", String(stats.total))}
          </span>
          <span>{stats.progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${stats.progress}%` }}
          />
        </div>
      </div>

      <div className="max-h-[50vh] flex-1 overflow-y-auto px-4">
        <ul className="grid gap-3 py-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border p-3">
              <div className="flex gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.capture.image}
                  alt=""
                  className="size-16 shrink-0 rounded object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={item.status} />
                    <span className="text-sm font-medium">
                      {statusLabel(item.status)}
                    </span>
                  </div>
                  {item.status === "queued" ? (
                    <Textarea
                      className="mt-2 min-h-12 text-xs"
                      placeholder={dict.logPlay.photo.hintPlaceholder}
                      value={item.hint ?? ""}
                      onChange={(event) =>
                        handleHintChange(item.id, event.target.value)
                      }
                    />
                  ) : null}
                  {item.error ? (
                    <p className="mt-1 text-xs text-destructive">
                      {item.error}
                    </p>
                  ) : null}
                  {item.rows ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {dict.logPlay.photo.successDescription.replace(
                        "{count}",
                        String(item.rows.length),
                      )}
                    </p>
                  ) : null}
                </div>
                {item.status === "error" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isRunning}
                    onClick={() => void handleReupload(item.id)}
                  >
                    {dict.logPlay.photo.multiQueue.retry}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        {noMatches && (
          <p className="py-2 text-sm text-muted-foreground">
            {dict.logPlay.photo.multiQueue.noMatches}
          </p>
        )}
      </div>

      <DrawerFooter className="grid grid-cols-2 gap-4 pt-2">
        {noMatches ? (
          <>
            <Button variant="outline" type="button" asChild>
              <Link href="/track">{dict.logPlay.photo.viewPlays}</Link>
            </Button>
            <Button type="button" onClick={onDone}>
              {dict.logPlay.photo.multiQueue.done}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" type="button" asChild>
              <Link href="/track">{dict.logPlay.photo.viewPlays}</Link>
            </Button>
            <Button
              type="button"
              disabled={isRunning || !stats.isCompleted || stats.success === 0}
              onClick={handleReview}
            >
              {dict.logPlay.photo.multiQueue.review}
            </Button>
          </>
        )}
      </DrawerFooter>
    </div>
  );
}

function StatusIcon({ status }: { status: QueueStatus }) {
  switch (status) {
    case "success":
      return (
        <HugeiconsIcon
          icon={CheckmarkCircle02Icon}
          strokeWidth={2}
          className="size-4 text-green-600"
        />
      );
    case "error":
      return (
        <HugeiconsIcon
          icon={Alert02Icon}
          strokeWidth={2}
          className="size-4 text-destructive"
        />
      );
    case "uploading":
      return (
        <HugeiconsIcon
          icon={Loading03Icon}
          strokeWidth={2}
          className="size-4 animate-spin text-primary"
        />
      );
    default:
      return <span className="size-2 rounded-full bg-muted-foreground/40" />;
  }
}
