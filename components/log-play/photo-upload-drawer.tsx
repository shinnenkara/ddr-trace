"use client";

import { useEffect, useState } from "react";
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
    });
    onClose();
  };

  const { title, content } = usePhotoLogUpload({ onMatch: handleMatch });

  useEffect(() => {
    setIsOpen(true);
  }, []);

  return (
    <Drawer open={isOpen} onOpenChange={handleModal}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        <div className="m-4 mt-0">{content}</div>
      </DrawerContent>
    </Drawer>
  );
}
