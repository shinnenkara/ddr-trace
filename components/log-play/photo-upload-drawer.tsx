"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { usePhotoLogUpload } from "@/components/log-play/use-photo-log-upload";
import { useDictionary } from "@/lib/i18n/dictionary-provider";
import type { LogPlayResult } from "@/lib/user-played-songs/user-played-song";

type Props = {
  onClose: () => void;
};

export function PhotoUploadDrawer({ onClose }: Props) {
  const dict = useDictionary();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleModal = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      onClose();
    }
  };

  const handleMatch = (result: LogPlayResult) => {
    const count = result.plays.length;
    toast.success(dict.logPlay.photo.success, {
      description: dict.logPlay.photo.successDescription.replace(
        "{count}",
        String(count),
      ),
      action: {
        label: dict.logPlay.photo.viewPlays,
        onClick: () => router.push("/track"),
      },
    });
    onClose();
  };

  const handleBatchFinished = (result: {
    total: number;
    success: number;
    failed: number;
  }) => {
    toast.success(
      dict.logPlay.photo.multiQueue.batchSummary
        .replace("{success}", String(result.success))
        .replace("{total}", String(result.total)),
      {
        action: {
          label: dict.logPlay.photo.viewPlays,
          onClick: () => {},
        },
      },
    );
  };

  const { title, content } = usePhotoLogUpload({
    onMatch: handleMatch,
    onBatchFinished: handleBatchFinished,
    onQueueDone: onClose,
  });

  useEffect(() => {
    setIsOpen(true);
  }, []);

  return (
    <Drawer open={isOpen} onOpenChange={handleModal}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        <div className="m-4 mt-0 flex min-h-0 flex-1 flex-col">{content}</div>
      </DrawerContent>
    </Drawer>
  );
}
