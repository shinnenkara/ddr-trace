"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { EditPlayForm } from "@/components/track-play/edit-play-form";
import { editPlayAction } from "@/lib/user-played-songs/edit-play-action";
import { deletePlayAction } from "@/lib/user-played-songs/delete-play-action";
import { useDictionary } from "@/lib/i18n/dictionary-provider";
import type { PlayWithSong } from "@/lib/user-played-songs/play-with-song";

type Props = {
  play: PlayWithSong;
  onClose: () => void;
  redirectOnDelete?: boolean;
};

export function PlayEditDrawer({
  play,
  onClose,
  redirectOnDelete = false,
}: Props) {
  const dict = useDictionary();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);
  const [editState, editAction, editPending] = useActionState(editPlayAction, {});
  const [deletePending, startDelete] = useTransition();

  useEffect(() => {
    setIsOpen(true);
  }, [play.id]);

  useEffect(() => {
    if (!editState.data) {
      return;
    }

    toast.success(dict.track.edit.success);
    setIsOpen(false);
    onClose();
    router.refresh();
  }, [dict.track.edit.success, editState.data, onClose, router]);

  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      onClose();
    }
  };

  const handleDelete = () => {
    if (!window.confirm(dict.track.edit.deleteConfirm)) {
      return;
    }

    startDelete(async () => {
      const formData = new FormData();
      formData.set("play_id", String(play.id));

      const result = await deletePlayAction({}, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(dict.track.edit.deleteSuccess);
      handleClose();

      if (redirectOnDelete) {
        router.push("/track");
      } else {
        router.refresh();
      }
    });
  };

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{dict.track.edit.title}</DrawerTitle>
        </DrawerHeader>
        <form action={editAction} className="grid gap-4 px-4">
          <EditPlayForm play={play} />
          {editState.error ? (
            <p className="text-sm text-destructive">{editState.error}</p>
          ) : null}
          <DrawerFooter className="grid grid-cols-2 gap-4 px-0 pb-4">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={editPending || deletePending}
            >
              {deletePending
                ? dict.track.edit.deleting
                : dict.track.edit.delete}
            </Button>
            <Button type="submit" disabled={editPending || deletePending}>
              {editPending ? dict.track.edit.submitting : dict.track.edit.submit}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
